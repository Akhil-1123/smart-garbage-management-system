const db = require('../config/db');
const { ok, fail } = require('../utils/response');
const { createNotification } = require('../utils/notify');
const { getActiveSubscription } = require('../utils/subscriptions');

/**
 * POST /api/collections (role: user)
 * Body: { bin_id, waste_type?, address, latitude, longitude, remarks? }
 * Rules in strict order (400 if failed):
 * 1. The bin must belong to this user and be active.
 * 2. The user must have an active subscription (getActiveSubscription), otherwise "Please subscribe to a plan before requesting collection".
 * 3. The bin fill_status must be half or full, otherwise "Bin is empty. Update the bin status first".
 * 4. No other request for this bin may be in pending/approved/driver_assigned.
 */
const createRequest = async (req, res) => {
  try {
    const { bin_id, waste_type, address, latitude, longitude, remarks } = req.body;

    if (!bin_id) {
      return fail(res, 400, 'bin_id is required');
    }

    // Rule 1: The bin must belong to this user and be active.
    const [binRows] = await db.query(
      `SELECT b.* 
       FROM user_bins ub
       JOIN bins b ON ub.bin_id = b.id
       WHERE ub.bin_id = ? AND ub.user_id = ? AND ub.is_active = TRUE AND b.status = 'active'`,
      [bin_id, req.user.id]
    );

    if (binRows.length === 0) {
      return fail(res, 400, 'The bin must belong to this user and be active.');
    }

    const bin = binRows[0];

    // Rule 2: The user must have an active subscription.
    const activeSub = await getActiveSubscription(req.user.id);
    if (!activeSub) {
      return fail(res, 400, 'Please subscribe to a plan before requesting collection');
    }

    // Rule 3: The bin fill_status must be half or full.
    if (bin.fill_status !== 'half' && bin.fill_status !== 'full') {
      return fail(res, 400, 'Bin is empty. Update the bin status first');
    }

    // Rule 4: No other request for this bin may be in pending/approved/driver_assigned.
    const [openRequests] = await db.query(
      `SELECT id 
       FROM collection_requests 
       WHERE bin_id = ? AND status IN ('pending', 'approved', 'driver_assigned')
       LIMIT 1`,
      [bin_id]
    );

    if (openRequests.length > 0) {
      return fail(res, 400, 'A collection request for this bin is already pending or in progress');
    }

    // Validation passed, insert request
    const chosenWasteType = waste_type || bin.bin_type || 'organic';
    const chosenAddress = address || bin.location || req.user.address;
    const chosenLat = latitude !== undefined ? latitude : bin.latitude;
    const chosenLng = longitude !== undefined ? longitude : bin.longitude;

    const [insertResult] = await db.query(
      `INSERT INTO collection_requests (
         user_id, bin_id, driver_id, waste_type, status,
         address, latitude, longitude, requested_at, remarks
       ) VALUES (?, ?, NULL, ?, 'pending', ?, ?, ?, NOW(), ?)`,
      [
        req.user.id,
        bin.id,
        chosenWasteType,
        chosenAddress,
        chosenLat,
        chosenLng,
        remarks || null
      ]
    );

    const requestId = insertResult.insertId;

    // Notify user
    await createNotification(req.user.id, 'collection', 'Collection request submitted');

    // Notify every admin: "New collection request from <name>"
    const [admins] = await db.query(
      `SELECT u.id 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE r.name = 'admin' AND u.is_active = TRUE`
    );

    for (const admin of admins) {
      await createNotification(admin.id, 'collection', `New collection request from ${req.user.name}`);
    }

    // Return created request
    const [newRequest] = await db.query(
      'SELECT * FROM collection_requests WHERE id = ?',
      [requestId]
    );

    return ok(res, newRequest[0], 'Collection request submitted', 201);
  } catch (error) {
    console.error('createRequest error:', error);
    return fail(res, 500, 'Failed to create collection request');
  }
};

/**
 * GET /api/collections/my (role: user)
 * User's requests newest first, joined with bin location,
 * driver name/phone/vehicle_no (when assigned) and weight_kg from waste_records (when collected).
 */
const getMyRequests = async (req, res) => {
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
         cr.collected_at,
         cr.remarks,
         b.location AS bin_location,
         du.name AS driver_name,
         du.phone AS driver_phone,
         d.vehicle_no AS driver_vehicle_no,
         wr.weight_kg AS collected_weight_kg
       FROM collection_requests cr
       LEFT JOIN bins b ON cr.bin_id = b.id
       LEFT JOIN drivers d ON cr.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       LEFT JOIN waste_records wr ON cr.id = wr.collection_id
       WHERE cr.user_id = ?
       ORDER BY cr.requested_at DESC, cr.id DESC`,
      [req.user.id]
    );

    return ok(res, rows);
  } catch (error) {
    console.error('getMyRequests error:', error);
    return fail(res, 500, 'Failed to fetch user collection requests');
  }
};

/**
 * GET /api/collections/:id (role: user, owner only)
 * One request with same joins plus an array "timeline" of { status, at }
 * built from requested_at, approved_at, assigned_at, collected_at.
 */
const getRequestById = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    if (isNaN(requestId)) {
      return fail(res, 400, 'Invalid request ID');
    }

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
         cr.collected_at,
         cr.remarks,
         b.location AS bin_location,
         du.name AS driver_name,
         du.phone AS driver_phone,
         d.vehicle_no AS driver_vehicle_no,
         wr.weight_kg AS collected_weight_kg
       FROM collection_requests cr
       LEFT JOIN bins b ON cr.bin_id = b.id
       LEFT JOIN drivers d ON cr.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       LEFT JOIN waste_records wr ON cr.id = wr.collection_id
       WHERE cr.id = ? AND cr.user_id = ?`,
      [requestId, req.user.id]
    );

    if (rows.length === 0) {
      return fail(res, 404, 'Collection request not found');
    }

    const item = rows[0];

    // Construct timeline
    const timeline = [];
    if (item.requested_at) timeline.push({ status: 'pending', at: item.requested_at });
    if (item.approved_at) timeline.push({ status: 'approved', at: item.approved_at });
    if (item.assigned_at) timeline.push({ status: 'driver_assigned', at: item.assigned_at });
    if (item.collected_at) timeline.push({ status: 'collected', at: item.collected_at });
    if (item.status === 'cancelled') {
      timeline.push({ status: 'cancelled', at: item.collected_at || item.assigned_at || item.approved_at || item.requested_at });
    }

    return ok(res, { ...item, timeline });
  } catch (error) {
    console.error('getRequestById error:', error);
    return fail(res, 500, 'Failed to fetch request details');
  }
};

/**
 * PUT /api/collections/:id/cancel (role: user, owner only)
 * Allowed from pending/approved/driver_assigned.
 * If driver was assigned, set driver_assignments row to cancelled and unassigned_at now.
 */
const cancelRequest = async (req, res) => {
  let connection;
  try {
    const requestId = Number(req.params.id);
    if (isNaN(requestId)) {
      return fail(res, 400, 'Invalid request ID');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT * FROM collection_requests WHERE id = ? AND user_id = ? FOR UPDATE',
      [requestId, req.user.id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return fail(res, 404, 'Collection request not found');
    }

    const request = rows[0];

    if (!['pending', 'approved', 'driver_assigned'].includes(request.status)) {
      await connection.rollback();
      return fail(res, 400, `Cannot cancel request in "${request.status}" status`);
    }

    // Set request status to cancelled
    await connection.query(
      "UPDATE collection_requests SET status = 'cancelled' WHERE id = ?",
      [requestId]
    );

    // If driver was assigned, set driver_assignments to cancelled and unassigned_at NOW()
    if (request.driver_id) {
      await connection.query(
        "UPDATE driver_assignments SET status = 'cancelled', unassigned_at = NOW() WHERE collection_id = ? AND status = 'assigned'",
        [requestId]
      );
    }

    await connection.commit();

    // Notify user
    await createNotification(req.user.id, 'collection', 'Your collection request has been cancelled.');

    // If a driver was assigned, notify driver
    if (request.driver_id) {
      const [dUser] = await db.query(
        'SELECT user_id FROM drivers WHERE id = ?',
        [request.driver_id]
      );
      if (dUser.length > 0) {
        await createNotification(
          dUser[0].user_id,
          'collection',
          `Assigned collection request #${requestId} was cancelled by the user.`
        );
      }
    }

    return ok(res, { id: requestId, status: 'cancelled' }, 'Collection request cancelled successfully');
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('cancelRequest error:', error);
    return fail(res, 500, 'Failed to cancel collection request');
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  cancelRequest
};
