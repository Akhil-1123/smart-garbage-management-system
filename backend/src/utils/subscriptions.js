const db = require('../config/db');
const { createNotification } = require('./notify');

/**
 * Returns the currently active, non-expired subscription for a user, or null.
 * Expired subscriptions with end_date < CURDATE() are automatically marked as 'expired'.
 * @param {number} userId - The user ID
 * @returns {Promise<object|null>}
 */
async function getActiveSubscription(userId) {
  try {
    // Automatically transition expired active subscriptions
    await db.query(
      `UPDATE subscriptions 
       SET status = 'expired' 
       WHERE user_id = ? AND status = 'active' AND end_date < CURDATE()`,
      [userId]
    );

    const [rows] = await db.query(
      `SELECT s.*, sp.name AS plan_name, sp.plan_type, sp.price, sp.duration_days
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = ? AND s.status = 'active' AND s.end_date >= CURDATE()
       ORDER BY s.end_date DESC
       LIMIT 1`,
      [userId]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error fetching active subscription:', error);
    throw error;
  }
}

/**
 * Creates one idempotent reminder for each subscription expiry milestone.
 * Milestones cover 7 through 1 days before expiry, the expiry date, and
 * the day after expiry.
 */
async function runSubscriptionExpiryNotifications(userId = null) {
  try {
    const userFilterUpdate = userId ? 'AND user_id = ?' : '';
    const userFilterSelect = userId ? 'AND s.user_id = ?' : '';
    const params = userId ? [userId] : [];

    await db.query(
      `UPDATE subscriptions
       SET status = 'expired'
       WHERE status = 'active' AND end_date < CURDATE() ${userFilterUpdate}`,
      params
    );

    const [subscriptions] = await db.query(
      `SELECT s.id, s.user_id, s.end_date, sp.name AS plan_name,
              DATEDIFF(s.end_date, CURDATE()) AS days_until_end,
              DATE_FORMAT(s.end_date, '%d %b %Y') AS formatted_end_date
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.status <> 'cancelled'
         AND DATEDIFF(s.end_date, CURDATE()) BETWEEN -30 AND 7
         ${userFilterSelect}
       ORDER BY s.id`,
      params
    );

    let createdCount = 0;
    for (const subscription of subscriptions) {
      const daysUntilEnd = Number(subscription.days_until_end);
      let message;

      if (daysUntilEnd > 0) {
        message = `Your ${subscription.plan_name} subscription ends in ${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'} on ${subscription.formatted_end_date}. Please renew to continue using waste collection services.`;
      } else if (daysUntilEnd === 0) {
        message = `Your ${subscription.plan_name} subscription ends today (${subscription.formatted_end_date}). Please renew to continue using waste collection services.`;
      } else if (daysUntilEnd === -1) {
        message = `Your ${subscription.plan_name} subscription expired yesterday (${subscription.formatted_end_date}). Please renew to restore waste collection services.`;
      } else {
        const daysAgo = Math.abs(daysUntilEnd);
        message = `Your ${subscription.plan_name} subscription expired ${daysAgo} days ago (${subscription.formatted_end_date}). Please renew to restore waste collection services.`;
      }

      const [existing] = await db.query(
        `SELECT id
         FROM notifications
         WHERE user_id = ? AND type = 'system' AND message = ?
         LIMIT 1`,
        [subscription.user_id, message]
      );

      if (existing.length === 0) {
        await createNotification(subscription.user_id, 'system', message);
        createdCount += 1;
      }
    }

    return createdCount;
  } catch (error) {
    console.error('Error creating subscription expiry notifications:', error);
    throw error;
  }
}

module.exports = {
  getActiveSubscription,
  runSubscriptionExpiryNotifications
};
