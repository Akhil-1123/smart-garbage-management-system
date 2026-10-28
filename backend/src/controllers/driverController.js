const db = require('../config/db');
const { ok, fail } = require('../utils/response');
const { createNotification } = require('../utils/notify');

/**
 * Middleware helper to resolve driver row from req.user.id
 * Returns 403 if no active driver row exists.
 */
const resolveDriverProfile = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, u.name, u.email, u.phone, u.address 
       FROM drivers d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.user_id = ? AND d.is_active = TRUE`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return fail(res, 403, 'Driver profile not found or inactive');
    }

    req.driver = rows[0];
    next();
  } catch (error) {
    console.error('resolveDriverProfile error:', error);
    return fail(res, 500, 'Failed to resolve driver profile');
  }
};

/**
 * GET /api/driver/profile
 * Returns driver info + stats { assigned_now, collected_total, total_kg, average_rating }
 */
const getProfile = async (req, res) => {
  try {
    const driverId = req.driver.id;

    // 1. assigned_now: requests currently in driver_assigned status
    const [assignedRows] = await db.query(
      `SELECT COUNT(*) AS count 
       FROM collection_requests 
       WHERE driver_id = ? AND status = 'driver_assigned'`,
      [driverId]
    );

    // 2. collected_total: total collected requests
    const [collectedRows] = await db.query(
      `SELECT COUNT(*) AS count 
       FROM collection_requests 
       WHERE driver_id = ? AND status = 'collected'`,
      [driverId]
    );

    // 3. total_kg: sum of weight collected
    const [weightRows] = await db.query(
      `SELECT COALESCE(SUM(weight_kg), 0) AS total_kg 
       FROM waste_records 
       WHERE driver_id = ?`,
      [driverId]
    );

    // 4. average_rating: from feedback_complaints
    const [ratingRows] = await db.query(
      `SELECT COALESCE(ROUND(AVG(rating), 2), 0) AS average_rating 
       FROM feedback_complaints 
       WHERE driver_id = ? AND type = 'feedback' AND rating IS NOT NULL`,
      [driverId]
    );

    const stats = {
      assigned_now: Number(assignedRows[0].count),
      collected_total: Number(collectedRows[0].count),
      total_kg: Number(weightRows[0].total_kg),
      average_rating: Number(ratingRows[0].average_rating)
    };

    return ok(res, {
      driver: req.driver,
      stats
    });
  } catch (error) {
    console.error('getProfile error:', error);
    return fail(res, 500, 'Failed to fetch driver profile');
  }
};

/**
 * PUT /api/driver/availability
 * Body: { is_available }
 */
const setAvailability = async (req, res) => {
  try {
    const { is_available } = req.body;

    if (is_available === undefined) {
      return fail(res, 400, 'is_available boolean is required');
    }

    const availableStatus = Boolean(is_available);

    await db.query(
      'UPDATE drivers SET is_available = ? WHERE id = ?',
      [availableStatus, req.driver.id]
    );

    return ok(
      res,
      { is_available: availableStatus },
      `Availability updated to ${availableStatus ? 'available' : 'unavailable'}`
    );
  } catch (error) {
    console.error('setAvailability error:', error);
    return fail(res, 500, 'Failed to update availability');
  }
};

/**
 * GET /api/driver/collections
 * Requests assigned to this driver with status driver_assigned,
 * joined with customer name/phone, address, latitude, longitude, waste_type, remarks, bin fill_status.
 * Includes google_maps_url = "https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng.
 * Sorted by assigned_at.
 */
const getAssignedCollections = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         cr.id,
         cr.user_id,
         cr.bin_id,
         cr.driver_id,
         cr.waste_type,
         cr.status,
         cr.address,
         cr.latitude,
         cr.longitude,
         cr.requested_at,
         cr.approved_at,
         cr.assigned_at,
         cr.remarks,
         u.name AS customer_name,
         u.phone AS customer_phone,
         b.fill_status AS bin_fill_status,
         b.location AS bin_location
       FROM collection_requests cr
       JOIN users u ON cr.user_id = u.id
       LEFT JOIN bins b ON cr.bin_id = b.id
       WHERE cr.driver_id = ? AND cr.status = 'driver_assigned'
       ORDER BY cr.assigned_at ASC, cr.id ASC`,
      [req.driver.id]
    );

    const formatted = rows.map(r => ({
      ...r,
      google_maps_url: `https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`
    }));

    return ok(res, formatted);
  } catch (error) {
    console.error('getAssignedCollections error:', error);
    return fail(res, 500, 'Failed to fetch assigned collections');
  }
};

/**
 * PUT /api/driver/collections/:id/collect
 * Body: { weight_kg, notes? }
 * Only if request is assigned to THIS driver and status is driver_assigned.
 * weight_kg must be > 0 and <= 500.
 * In ONE transaction:
 * - set request to collected with collected_at now;
 * - insert waste_records row (processing_status collected, waste_type from request);
 * - mark driver_assignments row completed;
 * - reset bin to fill_status empty, level 0 and insert bin_status_history row "Empty".
 * Notify user "Your waste was collected (X kg). Please rate the service."
 * Return the waste record.
 */
const collectRequest = async (req, res) => {
  let connection;
  try {
    const requestId = Number(req.params.id);
    const { weight_kg, notes } = req.body;

    if (isNaN(requestId)) {
      return fail(res, 400, 'Invalid request ID');
    }

    const weight = Number(weight_kg);
    if (isNaN(weight) || weight <= 0 || weight > 500) {
      return fail(res, 400, 'weight_kg must be a number between 0 and 500');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [reqRows] = await connection.query(
      'SELECT * FROM collection_requests WHERE id = ? FOR UPDATE',
      [requestId]
    );

    if (reqRows.length === 0) {
      await connection.rollback();
      return fail(res, 404, 'Collection request not found');
    }

    const request = reqRows[0];

    // Check if assigned to THIS driver (403 if different driver)
    if (request.driver_id !== req.driver.id) {
      await connection.rollback();
      return fail(res, 403, 'Forbidden: This collection request is not assigned to you');
    }

    // Check status is driver_assigned
    if (request.status !== 'driver_assigned') {
      await connection.rollback();
      return fail(res, 400, `Request is not in "driver_assigned" status. Current status: ${request.status}`);
    }

    // 1. Set request to collected
    await connection.query(
      "UPDATE collection_requests SET status = 'collected', collected_at = NOW() WHERE id = ?",
      [requestId]
    );

    // 2. Insert waste_records row
    const [wasteResult] = await connection.query(
      `INSERT INTO waste_records (
         collection_id, bin_id, driver_id, waste_type,
         weight_kg, processing_status, recorded_at, notes
       ) VALUES (?, ?, ?, ?, ?, 'collected', NOW(), ?)`,
      [
        requestId,
        request.bin_id || null,
        req.driver.id,
        request.waste_type,
        weight,
        notes || null
      ]
    );

    const wasteRecordId = wasteResult.insertId;

    // 3. Mark driver_assignments row completed
    await connection.query(
      "UPDATE driver_assignments SET status = 'completed' WHERE collection_id = ? AND driver_id = ? AND status = 'assigned'",
      [requestId, req.driver.id]
    );

    // 4. Reset bin to fill_status empty, level 0 and insert bin_status_history row "Empty"
    if (request.bin_id) {
      await connection.query(
        "UPDATE bins SET fill_status = 'empty', current_level = 0.00 WHERE id = ?",
        [request.bin_id]
      );

      await connection.query(
        "INSERT INTO bin_status_history (bin_id, level, status, recorded_at) VALUES (?, 0.00, 'Empty', NOW())",
        [request.bin_id]
      );
    }

    await connection.commit();

    // 5. Notify the user: "Your waste was collected (X kg). Please rate the service."
    await createNotification(
      request.user_id,
      'collection',
      `Your waste was collected (${weight} kg). Please rate the service.`
    );

    // 6. Return the waste record
    const [newWasteRecord] = await db.query(
      'SELECT * FROM waste_records WHERE id = ?',
      [wasteRecordId]
    );

    return ok(res, newWasteRecord[0], 'Waste collected successfully');
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('collectRequest error:', error);
    return fail(res, 500, 'Failed to complete collection');
  } finally {
    if (connection) connection.release();
  }
};

/**
 * GET /api/driver/history
 * This driver's collected requests with customer name, address, weight_kg, collected_at,
 * and the rating given (if any).
 */
const getHistory = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         cr.id,
         cr.id AS collection_id,
         cr.address,
         cr.collected_at,
         u.name AS customer_name,
         u.phone AS customer_phone,
         wr.weight_kg,
         wr.waste_type,
         wr.notes,
         fc.rating
       FROM collection_requests cr
       JOIN users u ON cr.user_id = u.id
       LEFT JOIN waste_records wr ON cr.id = wr.collection_id
       LEFT JOIN feedback_complaints fc ON cr.id = fc.collection_id AND fc.type = 'feedback'
       WHERE cr.driver_id = ? AND cr.status = 'collected'
       ORDER BY cr.collected_at DESC, cr.id DESC`,
      [req.driver.id]
    );

    return ok(res, rows);
  } catch (error) {
    console.error('getHistory error:', error);
    return fail(res, 500, 'Failed to fetch driver collection history');
  }
};

module.exports = {
  resolveDriverProfile,
  getProfile,
  setAvailability,
  getAssignedCollections,
  collectRequest,
  getHistory
};
