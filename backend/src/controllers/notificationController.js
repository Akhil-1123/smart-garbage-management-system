const db = require('../config/db');
const { ok, fail } = require('../utils/response');
const { runSubscriptionExpiryNotifications } = require('../utils/subscriptions');

/**
 * GET /api/notifications (any logged-in role)
 * Returns latest 50 notifications and unread_count.
 */
const getNotifications = async (req, res) => {
  try {
    await runSubscriptionExpiryNotifications(req.user.id);

    // 1. Unread count
    const [countRows] = await db.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    const unreadCount = Number(countRows[0].count);

    // 2. Latest 50 notifications
    const [notifications] = await db.query(
      `SELECT id, user_id, type, message, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
      [req.user.id]
    );

    const formatted = notifications.map(n => ({
      ...n,
      is_read: Boolean(n.is_read)
    }));

    return ok(res, {
      notifications: formatted,
      unread_count: unreadCount
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return fail(res, 500, 'Failed to fetch notifications');
  }
};

/**
 * PUT /api/notifications/:id/read (any logged-in role)
 * Marks a single notification as read.
 */
const markAsRead = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    if (isNaN(notificationId)) {
      return fail(res, 400, 'Invalid notification ID');
    }

    const [existing] = await db.query(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );

    if (existing.length === 0) {
      return fail(res, 404, 'Notification not found');
    }

    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [notificationId]
    );

    return ok(res, { id: notificationId, is_read: true }, 'Notification marked as read');
  } catch (error) {
    console.error('markAsRead error:', error);
    return fail(res, 500, 'Failed to mark notification as read');
  }
};

/**
 * PUT /api/notifications/read-all (any logged-in role)
 * Marks all notifications for the user as read.
 */
const markAllAsRead = async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    return ok(res, null, 'All notifications marked as read');
  } catch (error) {
    console.error('markAllAsRead error:', error);
    return fail(res, 500, 'Failed to mark all notifications as read');
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
