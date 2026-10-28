const db = require('../config/db');
const { ok, fail } = require('../utils/response');

/**
 * Status and level mapping according to SGMS Rule 2:
 * empty = 0%, half = 50%, full = 100% of capacity
 */
const STATUS_MAP = {
  empty: { level: 0.0, text: 'Empty' },
  half: { level: 50.0, text: 'Half' },
  full: { level: 100.0, text: 'Full' }
};

/**
 * POST /api/bins (role: user)
 * Body: { location, latitude, longitude, bin_type?, capacity_kg? }
 * Transaction: inserts bins, user_bins, and initial bin_status_history row (level 0, status "Empty").
 * Limits user to 5 active bins (400 otherwise).
 */
const createBin = async (req, res) => {
  let connection;
  try {
    const { location, latitude, longitude, bin_type, capacity_kg } = req.body;

    if (!location || latitude === undefined || longitude === undefined) {
      return fail(res, 400, 'location, latitude, and longitude are required');
    }

    const validBinTypes = ['organic', 'recyclable', 'general'];
    const chosenType = bin_type && validBinTypes.includes(bin_type.toLowerCase())
      ? bin_type.toLowerCase()
      : 'organic';

    const chosenCapacity = capacity_kg ? Number(capacity_kg) : 20.0;
    if (isNaN(chosenCapacity) || chosenCapacity <= 0) {
      return fail(res, 400, 'capacity_kg must be a positive number');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check user active bin count limit (max 5)
    const [countRows] = await connection.query(
      `SELECT COUNT(*) AS active_count
       FROM user_bins ub
       JOIN bins b ON ub.bin_id = b.id
       WHERE ub.user_id = ? AND ub.is_active = TRUE AND b.status = 'active'
       FOR UPDATE`,
      [req.user.id]
    );

    if (countRows[0].active_count >= 5) {
      await connection.rollback();
      return fail(res, 400, 'Active bin limit reached (maximum 5 active bins allowed)');
    }

    // Insert into bins: installed_at now, fill_status empty, current_level 0
    const [binResult] = await connection.query(
      `INSERT INTO bins (location, latitude, longitude, bin_type, capacity_kg, current_level, fill_status, status, installed_at)
       VALUES (?, ?, ?, ?, ?, 0.00, 'empty', 'active', NOW())`,
      [location.trim(), latitude, longitude, chosenType, chosenCapacity]
    );

    const binId = binResult.insertId;

    // Insert into user_bins
    await connection.query(
      `INSERT INTO user_bins (user_id, bin_id, assigned_at, is_active)
       VALUES (?, ?, NOW(), TRUE)`,
      [req.user.id, binId]
    );

    // Insert first bin_status_history row (level 0, status "Empty")
    await connection.query(
      `INSERT INTO bin_status_history (bin_id, level, status, recorded_at)
       VALUES (?, 0.00, 'Empty', NOW())`,
      [binId]
    );

    await connection.commit();

    // Fetch the newly created bin record
    const [newBin] = await db.query(
      `SELECT b.*, ub.assigned_at, NOW() AS last_updated, FALSE AS has_open_request
       FROM bins b
       JOIN user_bins ub ON b.id = ub.bin_id
       WHERE b.id = ?`,
      [binId]
    );

    return ok(res, newBin[0], 'Bin created successfully', 201);
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('createBin error:', error);
    return fail(res, 500, 'Failed to create bin');
  } finally {
    if (connection) connection.release();
  }
};

/**
 * GET /api/bins/my (role: user)
 * Returns the user's active bins with fill_status, current_level, capacity_kg,
 * last_updated (latest history time), and has_open_request (true if pending/approved/driver_assigned).
 */
const getMyBins = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         b.id,
         b.location,
         b.latitude,
         b.longitude,
         b.bin_type,
         b.capacity_kg,
         b.current_level,
         b.fill_status,
         b.status,
         b.installed_at,
         ub.assigned_at,
         (
           SELECT MAX(recorded_at) 
           FROM bin_status_history bsh 
           WHERE bsh.bin_id = b.id
         ) AS last_updated,
         EXISTS(
           SELECT 1 
           FROM collection_requests cr 
           WHERE cr.bin_id = b.id 
             AND cr.status IN ('pending', 'approved', 'driver_assigned')
         ) AS has_open_request
       FROM user_bins ub
       JOIN bins b ON ub.bin_id = b.id
       WHERE ub.user_id = ? 
         AND ub.is_active = TRUE 
         AND b.status = 'active'
       ORDER BY b.id DESC`,
      [req.user.id]
    );

    const formatted = rows.map(r => ({
      ...r,
      has_open_request: Boolean(r.has_open_request)
    }));

    return ok(res, formatted);
  } catch (error) {
    console.error('getMyBins error:', error);
    return fail(res, 500, 'Failed to fetch user bins');
  }
};

/**
 * PUT /api/bins/:id (role: user, owner only)
 * Body: { location, latitude, longitude, bin_type, capacity_kg }
 */
const updateBin = async (req, res) => {
  try {
    const binId = Number(req.params.id);
    if (isNaN(binId)) {
      return fail(res, 400, 'Invalid bin ID');
    }

    const { location, latitude, longitude, bin_type, capacity_kg } = req.body;

    // Check ownership
    const [ownership] = await db.query(
      `SELECT b.id 
       FROM user_bins ub 
       JOIN bins b ON ub.bin_id = b.id 
       WHERE ub.bin_id = ? AND ub.user_id = ? AND ub.is_active = TRUE AND b.status = 'active'`,
      [binId, req.user.id]
    );

    if (ownership.length === 0) {
      return fail(res, 404, 'Bin not found or not owned by user');
    }

    const validBinTypes = ['organic', 'recyclable', 'general'];
    const chosenType = bin_type && validBinTypes.includes(bin_type.toLowerCase())
      ? bin_type.toLowerCase()
      : null;

    await db.query(
      `UPDATE bins
       SET location = COALESCE(?, location),
           latitude = COALESCE(?, latitude),
           longitude = COALESCE(?, longitude),
           bin_type = COALESCE(?, bin_type),
           capacity_kg = COALESCE(?, capacity_kg)
       WHERE id = ?`,
      [
        location ? location.trim() : null,
        latitude !== undefined ? latitude : null,
        longitude !== undefined ? longitude : null,
        chosenType,
        capacity_kg !== undefined ? Number(capacity_kg) : null,
        binId
      ]
    );

    const [updated] = await db.query('SELECT * FROM bins WHERE id = ?', [binId]);
    return ok(res, updated[0], 'Bin updated successfully');
  } catch (error) {
    console.error('updateBin error:', error);
    return fail(res, 500, 'Failed to update bin');
  }
};

/**
 * PUT /api/bins/:id/status (role: user, owner only)
 * Body: { fill_status }
 * Valid values: empty, half, full.
 * Updates bins.fill_status and bins.current_level (0, 50, 100),
 * inserts a bin_status_history row ("Empty"/"Half"/"Full").
 */
const updateBinStatus = async (req, res) => {
  let connection;
  try {
    const binId = Number(req.params.id);
    if (isNaN(binId)) {
      return fail(res, 400, 'Invalid bin ID');
    }

    const { fill_status } = req.body;
    const normalizedStatus = String(fill_status || '').trim().toLowerCase();

    if (!STATUS_MAP[normalizedStatus]) {
      return fail(res, 400, 'Invalid fill_status. Must be empty, half, or full');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check ownership
    const [ownership] = await connection.query(
      `SELECT b.id, b.capacity_kg
       FROM user_bins ub 
       JOIN bins b ON ub.bin_id = b.id 
       WHERE ub.bin_id = ? AND ub.user_id = ? AND ub.is_active = TRUE AND b.status = 'active'
       FOR UPDATE`,
      [binId, req.user.id]
    );

    if (ownership.length === 0) {
      await connection.rollback();
      return fail(res, 404, 'Bin not found or not owned by user');
    }

    const mapping = STATUS_MAP[normalizedStatus];

    // Update bins table
    await connection.query(
      'UPDATE bins SET fill_status = ?, current_level = ? WHERE id = ?',
      [normalizedStatus, mapping.level, binId]
    );

    // Insert history row
    const [historyResult] = await connection.query(
      'INSERT INTO bin_status_history (bin_id, level, status, recorded_at) VALUES (?, ?, ?, NOW())',
      [binId, mapping.level, mapping.text]
    );

    await connection.commit();

    const [updatedBin] = await db.query('SELECT * FROM bins WHERE id = ?', [binId]);
    const [historyRow] = await db.query('SELECT * FROM bin_status_history WHERE id = ?', [historyResult.insertId]);

    return ok(
      res,
      {
        bin: updatedBin[0],
        history: historyRow[0]
      },
      `Bin status updated to ${mapping.text}`
    );
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('updateBinStatus error:', error);
    return fail(res, 500, 'Failed to update bin status');
  } finally {
    if (connection) connection.release();
  }
};

/**
 * GET /api/bins/:id/history (role: user, owner only)
 * Returns latest 30 history rows for the owned bin.
 */
const getBinHistory = async (req, res) => {
  try {
    const binId = Number(req.params.id);
    if (isNaN(binId)) {
      return fail(res, 400, 'Invalid bin ID');
    }

    // Verify ownership
    const [ownership] = await db.query(
      'SELECT 1 FROM user_bins WHERE bin_id = ? AND user_id = ? AND is_active = TRUE',
      [binId, req.user.id]
    );

    if (ownership.length === 0) {
      return fail(res, 404, 'Bin not found or not owned by user');
    }

    const [rows] = await db.query(
      `SELECT id, bin_id, level, status, recorded_at
       FROM bin_status_history
       WHERE bin_id = ?
       ORDER BY recorded_at DESC, id DESC
       LIMIT 30`,
      [binId]
    );

    return ok(res, rows);
  } catch (error) {
    console.error('getBinHistory error:', error);
    return fail(res, 500, 'Failed to fetch bin history');
  }
};

/**
 * DELETE /api/bins/:id (role: user, owner only)
 * Sets user_bins.is_active = FALSE and bins.status = 'inactive'.
 * Blocks with 400 if bin has open requests.
 */
const deleteBin = async (req, res) => {
  let connection;
  try {
    const binId = Number(req.params.id);
    if (isNaN(binId)) {
      return fail(res, 400, 'Invalid bin ID');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Verify ownership
    const [ownership] = await connection.query(
      `SELECT b.id 
       FROM user_bins ub 
       JOIN bins b ON ub.bin_id = b.id 
       WHERE ub.bin_id = ? AND ub.user_id = ? AND ub.is_active = TRUE AND b.status = 'active'
       FOR UPDATE`,
      [binId, req.user.id]
    );

    if (ownership.length === 0) {
      await connection.rollback();
      return fail(res, 404, 'Bin not found or not owned by user');
    }

    // Check open collection requests
    const [openRequests] = await connection.query(
      `SELECT id 
       FROM collection_requests 
       WHERE bin_id = ? AND status IN ('pending', 'approved', 'driver_assigned') 
       LIMIT 1`,
      [binId]
    );

    if (openRequests.length > 0) {
      await connection.rollback();
      return fail(res, 400, 'Cannot delete bin with active collection requests');
    }

    // Soft delete: set user_bins.is_active false and bins.status inactive
    await connection.query(
      'UPDATE user_bins SET is_active = FALSE WHERE bin_id = ? AND user_id = ?',
      [binId, req.user.id]
    );

    await connection.query(
      "UPDATE bins SET status = 'inactive' WHERE id = ?",
      [binId]
    );

    await connection.commit();

    return ok(res, null, 'Bin deleted successfully');
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('deleteBin error:', error);
    return fail(res, 500, 'Failed to delete bin');
  } finally {
    if (connection) connection.release();
  }
};

/**
 * GET /api/admin/bins (admin only)
 * All bins with owner name, fill_status, level, last updated.
 */
const getAdminBins = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        b.id,
        b.location,
        b.latitude,
        b.longitude,
        b.bin_type,
        b.capacity_kg,
        b.current_level,
        b.fill_status,
        b.status,
        b.installed_at,
        u.id AS owner_id,
        u.name AS owner_name,
        u.email AS owner_email,
        (
          SELECT MAX(recorded_at) 
          FROM bin_status_history bsh 
          WHERE bsh.bin_id = b.id
        ) AS last_updated
      FROM bins b
      LEFT JOIN user_bins ub ON b.id = ub.bin_id AND ub.is_active = TRUE
      LEFT JOIN users u ON ub.user_id = u.id
      ORDER BY b.id DESC
    `);

    return ok(res, rows);
  } catch (error) {
    console.error('getAdminBins error:', error);
    return fail(res, 500, 'Failed to fetch all bins');
  }
};

module.exports = {
  createBin,
  getMyBins,
  updateBin,
  updateBinStatus,
  getBinHistory,
  deleteBin,
  getAdminBins
};
