const db = require('../config/db');
const { ok, fail } = require('../utils/response');
const { createNotification } = require('../utils/notify');
const { haversineDistance } = require('../utils/geo');

/**
 * GET /api/admin/collections
 * Query: ?status=
 * All requests joined with user name/phone, bin location, driver name, newest first.
 */
const listRequests = async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT 
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
        cr.collected_at,
        cr.remarks,
        u.name AS user_name,
        u.phone AS user_phone,
        b.location AS bin_location,
        du.name AS driver_name,
        du.phone AS driver_phone,
        d.vehicle_no AS driver_vehicle_no,
        wr.weight_kg AS collected_weight_kg
      FROM collection_requests cr
      JOIN users u ON cr.user_id = u.id
      LEFT JOIN bins b ON cr.bin_id = b.id
      LEFT JOIN drivers d ON cr.driver_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
      LEFT JOIN waste_records wr ON cr.id = wr.collection_id
      WHERE 1=1
    `;

    const params = [];
    if (status) {
      sql += ' AND cr.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY cr.requested_at DESC, cr.id DESC';

    const [rows] = await db.query(sql, params);
    return ok(res, rows);
  } catch (error) {
    console.error('listRequests error:', error);
    return fail(res, 500, 'Failed to fetch collection requests');
  }
};

/**
 * PUT /api/admin/collections/:id/approve
 * Only from pending; set approved and approved_at; notify the user.
 */
const approveRequest = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    if (isNaN(requestId)) {
      return fail(res, 400, 'Invalid request ID');
    }

    const [rows] = await db.query(
      'SELECT id, user_id, status FROM collection_requests WHERE id = ?',
      [requestId]
    );

    if (rows.length === 0) {
      return fail(res, 404, 'Collection request not found');
    }

    const request = rows[0];

    if (request.status !== 'pending') {
      return fail(res, 400, `Only pending requests can be approved. Current status: ${request.status}`);
    }

    await db.query(
      "UPDATE collection_requests SET status = 'approved', approved_at = NOW() WHERE id = ?",
      [requestId]
    );

    // Notify user
    await createNotification(
      request.user_id,
      'collection',
      `Your collection request #${requestId} has been approved by admin.`
    );

    const [updated] = await db.query(
      'SELECT * FROM collection_requests WHERE id = ?',
      [requestId]
    );

    return ok(res, updated[0], 'Collection request approved');
  } catch (error) {
    console.error('approveRequest error:', error);
    return fail(res, 500, 'Failed to approve collection request');
  }
};

/**
 * GET /api/admin/collections/:id/nearby-drivers
 * Only for approved requests.
 * Return all drivers where is_active and is_available are true,
 * each with distance_km computed in JS with Haversine formula,
 * sorted by distance ascending, plus open_jobs count.
 * Mark the first one with recommended: true.
 */
const getNearbyDrivers = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    if (isNaN(requestId)) {
      return fail(res, 400, 'Invalid request ID');
    }

    const [reqRows] = await db.query(
      'SELECT id, latitude, longitude, status FROM collection_requests WHERE id = ?',
      [requestId]
    );

    if (reqRows.length === 0) {
      return fail(res, 404, 'Collection request not found');
    }

    const request = reqRows[0];

    if (request.status !== 'approved') {
      return fail(res, 400, `Nearby drivers can only be viewed for approved requests. Current status: ${request.status}`);
    }

    const reqLat = Number(request.latitude);
    const reqLng = Number(request.longitude);

    // Fetch active & available drivers
    const [drivers] = await db.query(`
      SELECT 
        d.id,
        d.id AS driver_id,
        d.user_id,
        u.name,
        u.email,
        u.phone,
        d.license_no,
        d.vehicle_no,
        d.base_latitude,
        d.base_longitude,
        d.service_area,
        d.is_available,
        d.is_active,
        (
          SELECT COUNT(*) 
          FROM collection_requests cr 
          WHERE cr.driver_id = d.id AND cr.status = 'driver_assigned'
        ) AS open_jobs
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      WHERE d.is_active = TRUE AND d.is_available = TRUE AND u.is_active = TRUE
    `);

    // Calculate distance with Haversine formula
    const formattedDrivers = drivers.map(d => {
      const driverLat = Number(d.base_latitude);
      const driverLng = Number(d.base_longitude);
      const distance_km = haversineDistance(reqLat, reqLng, driverLat, driverLng);
      return {
        ...d,
        distance_km,
        recommended: false
      };
    });

    // Sort by distance ascending
    formattedDrivers.sort((a, b) => a.distance_km - b.distance_km);

    // Mark the first one recommended: true
    if (formattedDrivers.length > 0) {
      formattedDrivers[0].recommended = true;
    }

    return ok(res, formattedDrivers);
  } catch (error) {
    console.error('getNearbyDrivers error:', error);
    return fail(res, 500, 'Failed to fetch nearby drivers');
  }
};

/**
 * PUT /api/admin/collections/:id/assign
 * Body: { driver_id }
 * Only from approved (also allow re-assigning from driver_assigned: close old driver_assignments row as cancelled first).
 * Check driver is active. Set driver_id, status driver_assigned, assigned_at now;
 * insert driver_assignments row (status assigned). Notify user and driver.
 */
const assignDriver = async (req, res) => {
  let connection;
  try {
    const requestId = Number(req.params.id);
    const { driver_id } = req.body;

    if (isNaN(requestId)) {
      return fail(res, 400, 'Invalid request ID');
    }
    if (!driver_id) {
      return fail(res, 400, 'driver_id is required');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [reqRows] = await connection.query(
      'SELECT id, user_id, status, driver_id FROM collection_requests WHERE id = ? FOR UPDATE',
      [requestId]
    );

    if (reqRows.length === 0) {
      await connection.rollback();
      return fail(res, 404, 'Collection request not found');
    }

    const request = reqRows[0];

    if (request.status !== 'approved' && request.status !== 'driver_assigned') {
      await connection.rollback();
      return fail(
        res,
        400,
        `Request must be in "approved" or "driver_assigned" status to assign. Current status: ${request.status}`
      );
    }

    // Verify driver is active
    const [driverRows] = await connection.query(
      `SELECT d.id, d.user_id, u.name, u.phone 
       FROM drivers d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.id = ? AND d.is_active = TRUE AND u.is_active = TRUE FOR UPDATE`,
      [driver_id]
    );

    if (driverRows.length === 0) {
      await connection.rollback();
      return fail(res, 400, 'Driver not found or is inactive');
    }

    const driver = driverRows[0];

    // If re-assigning from driver_assigned, close the old assignment as cancelled
    if (request.status === 'driver_assigned') {
      await connection.query(
        "UPDATE driver_assignments SET status = 'cancelled', unassigned_at = NOW() WHERE collection_id = ? AND status = 'assigned'",
        [requestId]
      );
    }

    // Update request
    await connection.query(
      `UPDATE collection_requests 
       SET driver_id = ?, status = 'driver_assigned', assigned_at = NOW() 
       WHERE id = ?`,
      [driver.id, requestId]
    );

    // Insert new driver assignment
    await connection.query(
      `INSERT INTO driver_assignments (collection_id, driver_id, assigned_at, status) 
       VALUES (?, ?, NOW(), 'assigned')`,
      [requestId, driver.id]
    );

    await connection.commit();

    // Notify user
    await createNotification(
      request.user_id,
      'collection',
      `Driver ${driver.name} has been assigned to your collection request #${requestId}.`
    );

    // Notify driver
    await createNotification(
      driver.user_id,
      'collection',
      `You have been assigned collection request #${requestId}.`
    );

    const [updatedReq] = await db.query(
      'SELECT * FROM collection_requests WHERE id = ?',
      [requestId]
    );

    return ok(res, updatedReq[0], 'Driver assigned successfully');
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('assignDriver error:', error);
    return fail(res, 500, 'Failed to assign driver');
  } finally {
    if (connection) connection.release();
  }
};

/**
 * PUT /api/admin/collections/:id/cancel
 * Body: { remarks? }
 * Admin can cancel from pending/approved/driver_assigned with {remarks}; notify the user.
 */
const adminCancelRequest = async (req, res) => {
  let connection;
  try {
    const requestId = Number(req.params.id);
    const { remarks } = req.body;

    if (isNaN(requestId)) {
      return fail(res, 400, 'Invalid request ID');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [reqRows] = await connection.query(
      'SELECT id, user_id, status, driver_id, remarks FROM collection_requests WHERE id = ? FOR UPDATE',
      [requestId]
    );

    if (reqRows.length === 0) {
      await connection.rollback();
      return fail(res, 404, 'Collection request not found');
    }

    const request = reqRows[0];

    if (!['pending', 'approved', 'driver_assigned'].includes(request.status)) {
      await connection.rollback();
      return fail(res, 400, `Cannot cancel request in "${request.status}" status`);
    }

    const updatedRemarks = remarks ? remarks.trim() : request.remarks;

    // Update request status to cancelled
    await connection.query(
      "UPDATE collection_requests SET status = 'cancelled', remarks = ? WHERE id = ?",
      [updatedRemarks, requestId]
    );

    // If driver assigned, cancel assignment
    if (request.driver_id) {
      await connection.query(
        "UPDATE driver_assignments SET status = 'cancelled', unassigned_at = NOW() WHERE collection_id = ? AND status = 'assigned'",
        [requestId]
      );
    }

    await connection.commit();

    // Notify user
    const cancelMsg = remarks
      ? `Your collection request #${requestId} was cancelled by admin. Reason: ${remarks.trim()}`
      : `Your collection request #${requestId} was cancelled by admin.`;
    await createNotification(request.user_id, 'collection', cancelMsg);

    // If driver was assigned, notify driver as well
    if (request.driver_id) {
      const [dUser] = await db.query(
        'SELECT user_id FROM drivers WHERE id = ?',
        [request.driver_id]
      );
      if (dUser.length > 0) {
        await createNotification(
          dUser[0].user_id,
          'collection',
          `Assigned collection request #${requestId} was cancelled by admin.`
        );
      }
    }

    return ok(res, { id: requestId, status: 'cancelled' }, 'Collection request cancelled by admin');
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('adminCancelRequest error:', error);
    return fail(res, 500, 'Failed to cancel request');
  } finally {
    if (connection) connection.release();
  }
};

/**
 * GET /api/admin/waste-records
 * Filters: ?month=YYYY-MM and ?processing_status=
 * All waste records joined with user name, bin location, driver name.
 */
const listWasteRecords = async (req, res) => {
  try {
    const { month, processing_status } = req.query;

    let sql = `
      SELECT 
        wr.id,
        wr.collection_id,
        wr.bin_id,
        wr.driver_id,
        wr.waste_type,
        wr.weight_kg,
        wr.processing_status,
        wr.recorded_at,
        wr.notes,
        u.name AS user_name,
        u.phone AS user_phone,
        b.location AS bin_location,
        du.name AS driver_name,
        d.vehicle_no AS driver_vehicle_no
      FROM waste_records wr
      LEFT JOIN collection_requests cr ON wr.collection_id = cr.id
      LEFT JOIN users u ON cr.user_id = u.id
      LEFT JOIN bins b ON wr.bin_id = b.id
      LEFT JOIN drivers d ON wr.driver_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
      WHERE 1=1
    `;

    const params = [];

    if (month && /^\d{4}-\d{2}$/.test(month.trim())) {
      sql += " AND DATE_FORMAT(wr.recorded_at, '%Y-%m') = ?";
      params.push(month.trim());
    }

    if (processing_status) {
      sql += ' AND wr.processing_status = ?';
      params.push(processing_status);
    }

    sql += ' ORDER BY wr.recorded_at DESC';

    const [rows] = await db.query(sql, params);
    return ok(res, rows);
  } catch (error) {
    console.error('listWasteRecords error:', error);
    return fail(res, 500, 'Failed to fetch waste records');
  }
};

/**
 * PUT /api/admin/waste-records/:id
 * Body: { weight_kg }
 * Lets admin correct a weight (must be > 0).
 */
const updateWasteRecord = async (req, res) => {
  try {
    const recordId = Number(req.params.id);
    const { weight_kg } = req.body;

    if (isNaN(recordId)) {
      return fail(res, 400, 'Invalid waste record ID');
    }

    const weight = Number(weight_kg);
    if (isNaN(weight) || weight <= 0) {
      return fail(res, 400, 'weight_kg must be a number greater than 0');
    }

    const [existing] = await db.query(
      'SELECT id FROM waste_records WHERE id = ?',
      [recordId]
    );

    if (existing.length === 0) {
      return fail(res, 404, 'Waste record not found');
    }

    await db.query(
      'UPDATE waste_records SET weight_kg = ? WHERE id = ?',
      [weight, recordId]
    );

    const [updated] = await db.query(
      'SELECT * FROM waste_records WHERE id = ?',
      [recordId]
    );

    return ok(res, updated[0], 'Waste record weight updated successfully');
  } catch (error) {
    console.error('updateWasteRecord error:', error);
    return fail(res, 500, 'Failed to update waste record');
  }
};

module.exports = {
  listRequests,
  approveRequest,
  getNearbyDrivers,
  assignDriver,
  adminCancelRequest,
  listWasteRecords,
  updateWasteRecord
};
