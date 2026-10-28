const db = require('../config/db');
const { ok, fail } = require('../utils/response');

/**
 * GET /api/admin/users
 * Query params: ?search= (filters by name or email)
 * Returns role=user accounts with bins_count and active subscription plan name (or null).
 */
const listUsers = async (req, res) => {
  try {
    const { search } = req.query;

    let sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.address,
        u.is_active,
        u.created_at,
        u.updated_at,
        (
          SELECT COUNT(*) 
          FROM user_bins ub 
          JOIN bins b ON ub.bin_id = b.id 
          WHERE ub.user_id = u.id AND ub.is_active = TRUE AND b.status = 'active'
        ) AS bins_count,
        (
          SELECT sp.name 
          FROM subscriptions s 
          JOIN subscription_plans sp ON s.plan_id = sp.id 
          WHERE s.user_id = u.id AND s.status = 'active' AND s.end_date >= CURDATE() 
          ORDER BY s.end_date DESC 
          LIMIT 1
        ) AS active_plan_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'user'
    `;

    const params = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      sql += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(term, term);
    }

    sql += ' ORDER BY u.created_at DESC';

    const [rows] = await db.query(sql, params);
    return ok(res, rows);
  } catch (error) {
    console.error('listUsers error:', error);
    return fail(res, 500, 'Failed to fetch users');
  }
};

/**
 * PUT /api/admin/users/:id/toggle-active
 * Flips the user's is_active boolean.
 */
const toggleUserActive = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (isNaN(userId)) {
      return fail(res, 400, 'Invalid user ID');
    }

    // Verify user exists and is a regular user
    const [existing] = await db.query(
      `SELECT u.id, u.is_active, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'user'`,
      [userId]
    );

    if (existing.length === 0) {
      return fail(res, 404, 'User not found or is not a regular user');
    }

    const currentStatus = Boolean(existing[0].is_active);
    const newStatus = !currentStatus;

    await db.query(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, userId]
    );

    return ok(
      res,
      { id: userId, is_active: newStatus },
      `User ${newStatus ? 'activated' : 'deactivated'} successfully`
    );
  } catch (error) {
    console.error('toggleUserActive error:', error);
    return fail(res, 500, 'Failed to toggle user active status');
  }
};

module.exports = {
  listUsers,
  toggleUserActive
};
