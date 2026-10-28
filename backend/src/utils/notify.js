const db = require('../config/db');

/**
 * Inserts a new notification row for a specific user.
 * @param {number} userId - ID of the recipient user
 * @param {'collection'|'order'|'system'} type - Notification type
 * @param {string} message - Notification text message (max 255 chars)
 */
async function createNotification(userId, type, message) {
  try {
    const [result] = await db.query(
      `INSERT INTO notifications (user_id, type, message, is_read, created_at)
       VALUES (?, ?, ?, FALSE, NOW())`,
      [userId, type, message]
    );
    return result;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

module.exports = {
  createNotification
};
