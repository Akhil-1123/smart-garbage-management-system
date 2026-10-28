const db = require('../config/db');
const { ok, fail } = require('../utils/response');
const { createNotification } = require('../utils/notify');

/**
 * GET /api/subscription-plans (public)
 * Returns all active subscription plans.
 */
const getPlans = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, plan_type, price, duration_days, description
       FROM subscription_plans
       WHERE is_active = TRUE
       ORDER BY price ASC`
    );
    return ok(res, rows);
  } catch (error) {
    console.error('getPlans error:', error);
    return fail(res, 500, 'Failed to fetch subscription plans');
  }
};

/**
 * POST /api/subscriptions (role: user)
 * Body: { plan_id, payment_method }
 * MOCK payment.
 * In ONE transaction:
 * - If user already has active subscription with end_date in future -> 400 "You already have an active subscription"
 * - Insert subscription (start today, end today + duration_days, amount = plan price, status active)
 * - Insert payments row (subscription_id set, status success, generated transaction_id, paid_at now)
 * - Create a notification for the user
 * - Return subscription and payment
 */
const subscribe = async (req, res) => {
  let connection;
  try {
    const { plan_id, payment_method } = req.body;

    if (!plan_id) {
      return fail(res, 400, 'plan_id is required');
    }

    const validMethods = ['card', 'upi', 'cod', 'wallet'];
    const chosenMethod = payment_method && validMethods.includes(payment_method.toLowerCase())
      ? payment_method.toLowerCase()
      : 'card';

    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Check if user already has an active subscription whose end_date is in the future
    const [existingActive] = await connection.query(
      `SELECT id, end_date 
       FROM subscriptions 
       WHERE user_id = ? AND status = 'active' AND end_date >= CURDATE()
       FOR UPDATE`,
      [req.user.id]
    );

    if (existingActive.length > 0) {
      await connection.rollback();
      return fail(res, 400, 'You already have an active subscription');
    }

    // 2. Fetch the plan
    const [planRows] = await connection.query(
      `SELECT id, name, plan_type, price, duration_days, is_active
       FROM subscription_plans
       WHERE id = ? FOR UPDATE`,
      [plan_id]
    );

    if (planRows.length === 0 || !planRows[0].is_active) {
      await connection.rollback();
      return fail(res, 404, 'Subscription plan not found or inactive');
    }

    const plan = planRows[0];

    // 3. Insert subscription: start today, end today + duration_days
    const [subResult] = await connection.query(
      `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status, amount, created_at)
       VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 'active', ?, NOW())`,
      [req.user.id, plan.id, plan.duration_days, plan.price]
    );

    const subscriptionId = subResult.insertId;

    // 4. Generate transaction ID (Rule 5)
    const transactionId = 'TXN' + Date.now() + Math.floor(1000 + Math.random() * 9000);

    // 5. Insert payment row
    const [payResult] = await connection.query(
      `INSERT INTO payments (user_id, order_id, subscription_id, amount, payment_method, transaction_id, status, paid_at)
       VALUES (?, NULL, ?, ?, ?, ?, 'success', NOW())`,
      [req.user.id, subscriptionId, plan.price, chosenMethod, transactionId]
    );

    const paymentId = payResult.insertId;

    await connection.commit();

    // 6. Create notification for the user
    await createNotification(
      req.user.id,
      'system',
      `Your subscription to ${plan.name} has been activated successfully! (Txn ID: ${transactionId})`
    );

    // Fetch created records to return
    const [subData] = await db.query(
      `SELECT s.*, sp.name AS plan_name, sp.plan_type, sp.duration_days
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.id = ?`,
      [subscriptionId]
    );

    const [payData] = await db.query(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );

    return ok(
      res,
      {
        subscription: subData[0],
        payment: payData[0]
      },
      'Subscription created and mock payment processed successfully',
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
    console.error('subscribe error:', error);
    return fail(res, 500, 'Subscription failed');
  } finally {
    if (connection) connection.release();
  }
};

const { getActiveSubscription, runSubscriptionExpiryNotifications } = require('../utils/subscriptions');

/**
 * GET /api/subscriptions/my (role: user)
 * All of the user's subscriptions newest first, each with plan name and a boolean is_current.
 * Before returning, run an UPDATE that sets status='expired' for this user's subscriptions with end_date < today and status='active'.
 */
const getMySubscriptions = async (req, res) => {
  try {
    await runSubscriptionExpiryNotifications(req.user.id);

    // 2. Fetch all user subscriptions
    const [rows] = await db.query(
      `SELECT 
         s.id,
         s.user_id,
         s.plan_id,
         s.start_date,
         s.end_date,
         s.status,
         s.amount,
         s.created_at,
         sp.name AS plan_name,
         sp.plan_type,
         sp.duration_days,
         (s.status = 'active' AND s.end_date >= CURDATE()) AS is_current
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    const formatted = rows.map(r => ({
      ...r,
      is_current: Boolean(r.is_current)
    }));

    return ok(res, formatted);
  } catch (error) {
    console.error('getMySubscriptions error:', error);
    return fail(res, 500, 'Failed to fetch subscriptions');
  }
};

/**
 * PUT /api/subscriptions/:id/cancel (role: user)
 * Own active subscription only, set status cancelled.
 */
const cancelSubscription = async (req, res) => {
  try {
    const subId = Number(req.params.id);
    if (isNaN(subId)) {
      return fail(res, 400, 'Invalid subscription ID');
    }

    const [rows] = await db.query(
      'SELECT id, status, plan_id FROM subscriptions WHERE id = ? AND user_id = ?',
      [subId, req.user.id]
    );

    if (rows.length === 0) {
      return fail(res, 404, 'Subscription not found');
    }

    const sub = rows[0];

    if (sub.status !== 'active') {
      return fail(res, 400, 'Only active subscriptions can be cancelled');
    }

    await db.query(
      "UPDATE subscriptions SET status = 'cancelled' WHERE id = ?",
      [subId]
    );

    await createNotification(
      req.user.id,
      'system',
      'Your subscription has been cancelled.'
    );

    return ok(
      res,
      { id: subId, status: 'cancelled' },
      'Subscription cancelled successfully'
    );
  } catch (error) {
    console.error('cancelSubscription error:', error);
    return fail(res, 500, 'Failed to cancel subscription');
  }
};

/**
 * GET /api/admin/subscriptions (admin only)
 * All subscriptions with user name and plan name.
 */
const getAdminSubscriptions = async (req, res) => {
  try {
    // Automatically update expired active subscriptions globally
    await db.query(
      `UPDATE subscriptions
       SET status = 'expired'
       WHERE status = 'active' AND end_date < CURDATE()`
    );

    const [rows] = await db.query(
      `SELECT 
         s.id,
         s.user_id,
         u.name AS user_name,
         u.email AS user_email,
         s.plan_id,
         sp.name AS plan_name,
         sp.plan_type,
         s.start_date,
         s.end_date,
         s.status,
         s.amount,
         s.created_at,
         (s.status = 'active' AND s.end_date >= CURDATE()) AS is_current
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       JOIN subscription_plans sp ON s.plan_id = sp.id
       ORDER BY s.created_at DESC`
    );

    const formatted = rows.map(r => ({
      ...r,
      is_current: Boolean(r.is_current)
    }));

    return ok(res, formatted);
  } catch (error) {
    console.error('getAdminSubscriptions error:', error);
    return fail(res, 500, 'Failed to fetch all subscriptions');
  }
};

module.exports = {
  getPlans,
  subscribe,
  getMySubscriptions,
  cancelSubscription,
  getAdminSubscriptions
};
