const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { ok, fail } = require('../utils/response');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/admin/drivers
 * Returns list of drivers joined with user data,
 * plus average_rating (from feedback_complaints where driver_id matches, type feedback)
 * and total_collections (collection_requests collected).
 */
const listDrivers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.id,
        d.id AS driver_id,
        d.user_id,
        u.name,
        u.email,
        u.phone,
        u.address,
        u.is_active AS user_is_active,
        d.license_no,
        d.vehicle_no,
        d.base_latitude,
        d.base_longitude,
        d.service_area,
        d.is_available,
        d.is_active AS driver_is_active,
        d.created_at,
        d.updated_at,
        COALESCE((
          SELECT ROUND(AVG(fc.rating), 2)
          FROM feedback_complaints fc
          WHERE fc.driver_id = d.id AND fc.type = 'feedback' AND fc.rating IS NOT NULL
        ), 0) AS average_rating,
        (
          SELECT COUNT(*)
          FROM collection_requests cr
          WHERE cr.driver_id = d.id AND cr.status = 'collected'
        ) AS total_collections
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.id ASC
    `);

    return ok(res, rows);
  } catch (error) {
    console.error('listDrivers error:', error);
    return fail(res, 500, 'Failed to fetch drivers');
  }
};

/**
 * POST /api/admin/drivers
 * Body: { name, email, phone, password, address, license_no, vehicle_no, base_latitude, base_longitude, service_area }
 * In ONE transaction: creates user (role driver) and driver profile. Checks duplicate email.
 */
const createDriver = async (req, res) => {
  let connection;
  try {
    const {
      name,
      email,
      phone,
      password,
      address,
      license_no,
      vehicle_no,
      base_latitude,
      base_longitude,
      service_area
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !address ||
      !license_no ||
      !vehicle_no ||
      base_latitude === undefined ||
      base_longitude === undefined ||
      !service_area
    ) {
      return fail(
        res,
        400,
        'All fields are required (name, email, phone, password, address, license_no, vehicle_no, base_latitude, base_longitude, service_area)'
      );
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return fail(res, 400, 'Invalid email format');
    }

    if (password.length < 6) {
      return fail(res, 400, 'Password must be at least 6 characters');
    }

    const normalizedEmail = email.trim().toLowerCase();

    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Check duplicate email (409)
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE LOWER(email) = ? FOR UPDATE',
      [normalizedEmail]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return fail(res, 409, 'Email is already registered');
    }

    // 2. Fetch driver role ID
    const [roleRows] = await connection.query(
      'SELECT id FROM roles WHERE name = ?',
      ['driver']
    );
    if (roleRows.length === 0) {
      await connection.rollback();
      return fail(res, 500, 'Role "driver" not found in system');
    }
    const driverRoleId = roleRows[0].id;

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insert user
    const [userResult] = await connection.query(
      `INSERT INTO users (role_id, name, email, phone, password_hash, address, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [
        driverRoleId,
        name.trim(),
        normalizedEmail,
        phone.trim(),
        passwordHash,
        address.trim()
      ]
    );

    const userId = userResult.insertId;

    // 5. Insert driver
    const [driverResult] = await connection.query(
      `INSERT INTO drivers (user_id, license_no, vehicle_no, base_latitude, base_longitude, service_area, is_available, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE)`,
      [
        userId,
        license_no.trim(),
        vehicle_no.trim(),
        base_latitude,
        base_longitude,
        service_area.trim()
      ]
    );

    const driverId = driverResult.insertId;

    await connection.commit();

    return ok(
      res,
      {
        id: driverId,
        driver_id: driverId,
        user_id: userId,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        address: address.trim(),
        license_no: license_no.trim(),
        vehicle_no: vehicle_no.trim(),
        base_latitude,
        base_longitude,
        service_area: service_area.trim(),
        is_available: true,
        is_active: true
      },
      'Driver created successfully',
      201
    );
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('createDriver error:', error);
    return fail(res, 500, 'Failed to create driver');
  } finally {
    if (connection) connection.release();
  }
};

/**
 * PUT /api/admin/drivers/:id
 * Updates user name/phone/address and driver fields (license_no, vehicle_no, base_latitude, base_longitude, service_area), and is_available.
 */
const updateDriver = async (req, res) => {
  let connection;
  try {
    const driverId = Number(req.params.id);
    if (isNaN(driverId)) {
      return fail(res, 400, 'Invalid driver ID');
    }

    const {
      name,
      phone,
      address,
      license_no,
      vehicle_no,
      base_latitude,
      base_longitude,
      service_area,
      is_available
    } = req.body;

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [driverRows] = await connection.query(
      'SELECT id, user_id FROM drivers WHERE id = ? FOR UPDATE',
      [driverId]
    );

    if (driverRows.length === 0) {
      await connection.rollback();
      return fail(res, 404, 'Driver not found');
    }

    const userId = driverRows[0].user_id;

    // Update user info
    await connection.query(
      `UPDATE users 
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           updated_at = NOW()
       WHERE id = ?`,
      [name ? name.trim() : null, phone ? phone.trim() : null, address ? address.trim() : null, userId]
    );

    // Update driver info
    await connection.query(
      `UPDATE drivers
       SET license_no = COALESCE(?, license_no),
           vehicle_no = COALESCE(?, vehicle_no),
           base_latitude = COALESCE(?, base_latitude),
           base_longitude = COALESCE(?, base_longitude),
           service_area = COALESCE(?, service_area),
           is_available = COALESCE(?, is_available),
           updated_at = NOW()
       WHERE id = ?`,
      [
        license_no ? license_no.trim() : null,
        vehicle_no ? vehicle_no.trim() : null,
        base_latitude !== undefined ? base_latitude : null,
        base_longitude !== undefined ? base_longitude : null,
        service_area ? service_area.trim() : null,
        is_available !== undefined ? is_available : null,
        driverId
      ]
    );

    await connection.commit();

    // Fetch updated driver
    const [updated] = await db.query(
      `SELECT d.id AS driver_id, d.user_id, u.name, u.email, u.phone, u.address,
              d.license_no, d.vehicle_no, d.base_latitude, d.base_longitude,
              d.service_area, d.is_available, d.is_active AS driver_is_active,
              u.is_active AS user_is_active
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ?`,
      [driverId]
    );

    return ok(res, updated[0], 'Driver updated successfully');
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('updateDriver error:', error);
    return fail(res, 500, 'Failed to update driver');
  } finally {
    if (connection) connection.release();
  }
};

/**
 * PUT /api/admin/drivers/:id/toggle-active
 * Deactivates/activates: update both drivers.is_active and users.is_active.
 * A deactivated driver cannot log in.
 */
const toggleDriverActive = async (req, res) => {
  let connection;
  try {
    const driverId = Number(req.params.id);
    if (isNaN(driverId)) {
      return fail(res, 400, 'Invalid driver ID');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [driverRows] = await connection.query(
      'SELECT id, user_id, is_active FROM drivers WHERE id = ? FOR UPDATE',
      [driverId]
    );

    if (driverRows.length === 0) {
      await connection.rollback();
      return fail(res, 404, 'Driver not found');
    }

    const currentStatus = Boolean(driverRows[0].is_active);
    const newStatus = !currentStatus;
    const userId = driverRows[0].user_id;

    // Update both drivers and users
    await connection.query(
      'UPDATE drivers SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, driverId]
    );

    await connection.query(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, userId]
    );

    await connection.commit();

    return ok(
      res,
      { id: driverId, driver_id: driverId, user_id: userId, is_active: newStatus },
      `Driver ${newStatus ? 'activated' : 'deactivated'} successfully`
    );
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('toggleDriverActive error:', error);
    return fail(res, 500, 'Failed to toggle driver active status');
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  listDrivers,
  createDriver,
  updateDriver,
  toggleDriverActive
};
