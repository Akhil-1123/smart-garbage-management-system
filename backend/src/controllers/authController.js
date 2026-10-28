const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { ok, fail } = require('../utils/response');

// Helper to generate JWT token with { id, role }
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'sgms_secret_key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Email format regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * Body: { name, email, phone, password, address }
 */
const register = async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;

    // 1. Validate required fields
    if (!name || !email || !phone || !password || !address) {
      return fail(res, 400, 'All fields are required (name, email, phone, password, address)');
    }

    // 2. Validate email format
    if (!EMAIL_REGEX.test(email.trim())) {
      return fail(res, 400, 'Invalid email format');
    }

    // 3. Validate password length (min 6 chars)
    if (password.length < 6) {
      return fail(res, 400, 'Password must be at least 6 characters');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 4. Check if email already used (409)
    const [existing] = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = ?',
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return fail(res, 409, 'Email is already registered');
    }

    // 5. Always assign role "user"
    const [roles] = await db.query('SELECT id FROM roles WHERE name = ?', ['user']);
    if (roles.length === 0) {
      return fail(res, 500, 'Role "user" not found in system');
    }
    const roleId = roles[0].id;

    // 6. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 7. Insert user
    const [insertResult] = await db.query(
      `INSERT INTO users (role_id, name, email, phone, password_hash, address, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [roleId, name.trim(), normalizedEmail, phone.trim(), passwordHash, address.trim()]
    );

    const newUserId = insertResult.insertId;
    const token = generateToken(newUserId, 'user');

    return ok(
      res,
      {
        token,
        user: {
          id: newUserId,
          name: name.trim(),
          email: normalizedEmail,
          phone: phone.trim(),
          address: address.trim(),
          role: 'user'
        }
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return fail(res, 500, 'Registration failed');
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return fail(res, 400, 'Email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user with role and driver profile (if driver)
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.address, u.password_hash, u.is_active,
              r.name AS role, d.id AS driver_id, d.is_active AS driver_is_active
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN drivers d ON u.id = d.user_id
       WHERE LOWER(u.email) = ?`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return fail(res, 401, 'Invalid email or password');
    }

    const user = rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return fail(res, 401, 'Invalid email or password');
    }

    // Check deactivated status (users.is_active and for drivers, drivers.is_active)
    if (!user.is_active || (user.role === 'driver' && user.driver_is_active === 0)) {
      return fail(res, 403, 'Account is deactivated');
    }

    const token = generateToken(user.id, user.role);

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role
    };

    if (user.role === 'driver' && user.driver_id) {
      userResponse.driver_id = user.driver_id;
    }

    return ok(res, { token, user: userResponse }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    return fail(res, 500, 'Login failed');
  }
};

/**
 * GET /api/auth/me (protect)
 * Returns current user (plus driver profile when role is driver)
 */
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.address, u.is_active, u.created_at, u.updated_at,
              r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return fail(res, 404, 'User not found');
    }

    const user = rows[0];

    if (user.role === 'driver') {
      const [driverRows] = await db.query(
        `SELECT id AS driver_id, license_no, vehicle_no, base_latitude, base_longitude,
                service_area, is_available, is_active AS driver_is_active, created_at, updated_at
         FROM drivers
         WHERE user_id = ?`,
        [user.id]
      );
      if (driverRows.length > 0) {
        user.driver = driverRows[0];
        user.driver_id = driverRows[0].driver_id;
      }
    }

    return ok(res, user);
  } catch (error) {
    console.error('getMe error:', error);
    return fail(res, 500, 'Failed to fetch user profile');
  }
};

/**
 * PUT /api/auth/profile (protect)
 * Updates name, phone, address (drivers cannot change license/vehicle here)
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name && !phone && !address) {
      return fail(res, 400, 'At least one field (name, phone, address) is required');
    }

    await db.query(
      `UPDATE users 
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           updated_at = NOW()
       WHERE id = ?`,
      [name ? name.trim() : null, phone ? phone.trim() : null, address ? address.trim() : null, req.user.id]
    );

    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.address, u.is_active, u.created_at, u.updated_at,
              r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    const updatedUser = rows[0];

    if (updatedUser.role === 'driver') {
      const [driverRows] = await db.query(
        `SELECT id AS driver_id, license_no, vehicle_no, base_latitude, base_longitude,
                service_area, is_available, is_active AS driver_is_active
         FROM drivers
         WHERE user_id = ?`,
        [updatedUser.id]
      );
      if (driverRows.length > 0) {
        updatedUser.driver = driverRows[0];
        updatedUser.driver_id = driverRows[0].driver_id;
      }
    }

    return ok(res, updatedUser, 'Profile updated successfully');
  } catch (error) {
    console.error('updateProfile error:', error);
    return fail(res, 500, 'Failed to update profile');
  }
};

/**
 * PUT /api/auth/password (protect)
 * Body: { current_password, new_password }
 */
const updatePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return fail(res, 400, 'Current password and new password are required');
    }

    if (new_password.length < 6) {
      return fail(res, 400, 'New password must be at least 6 characters');
    }

    const [rows] = await db.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return fail(res, 404, 'User not found');
    }

    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) {
      return fail(res, 400, 'Current password is incorrect');
    }

    const newHash = await bcrypt.hash(new_password, 10);

    await db.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newHash, req.user.id]
    );

    return ok(res, null, 'Password updated successfully');
  } catch (error) {
    console.error('updatePassword error:', error);
    return fail(res, 500, 'Failed to update password');
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword
};
