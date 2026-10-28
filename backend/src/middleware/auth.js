const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { fail } = require('../utils/response');

/**
 * Middleware: protect
 * Verifies JWT from Authorization: Bearer <token>
 * Loads req.user = { id, role, name, email, phone, address, ... }
 * Returns 401 if token is missing or invalid
 * Returns 403 if account is deactivated
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return fail(res, 401, 'Access token required');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'sgms_secret_key');
    } catch (err) {
      return fail(res, 401, 'Invalid or expired token');
    }

    if (!decoded || !decoded.id) {
      return fail(res, 401, 'Invalid token payload');
    }

    // Load user and role from database
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.address, u.is_active, r.name AS role,
              d.id AS driver_id, d.is_active AS driver_is_active
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN drivers d ON u.id = d.user_id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return fail(res, 401, 'User no longer exists');
    }

    const user = rows[0];

    // Check if user is deactivated
    if (!user.is_active || (user.role === 'driver' && user.driver_is_active === 0)) {
      return fail(res, 403, 'Account is deactivated');
    }

    req.user = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      driver_id: user.driver_id || null
    };

    next();
  } catch (error) {
    console.error('Auth protect middleware error:', error);
    return fail(res, 500, 'Authentication error');
  }
};

/**
 * Middleware: requireRole(...roles)
 * Returns 403 if user's role is not within the allowed roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, 'Forbidden: Insufficient permissions');
    }
    next();
  };
};

module.exports = {
  protect,
  requireRole,
  authenticateToken: protect,
  authorizeRoles: requireRole
};
