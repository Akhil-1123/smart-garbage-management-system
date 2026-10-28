const db = require('../config/db');
const { ok, fail } = require('../utils/response');
const { createNotification } = require('../utils/notify');

/**
 * POST /api/orders (role: user only)
 * Body: { items: [{ product_id, quantity }], shipping_address, payment_method }
 * In ONE transaction:
 * - Locks each product row (FOR UPDATE)
 * - Checks product is active and stock >= quantity (else 400 naming the product)
 * - Computes total from current product price
 * - Inserts order (status paid; if cod, order status pending)
 * - Inserts order_items
 * - Decreases stock
 * - Inserts payment (status success, generated txn_id; if cod, status pending)
 * - Notifies user "Order #id placed"
 */
const createOrder = async (req, res) => {
  let connection;
  try {
    const { items, shipping_address, payment_method } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return fail(res, 400, 'items array with at least one item is required');
    }

    if (!shipping_address || !shipping_address.trim()) {
      return fail(res, 400, 'shipping_address is required');
    }

    const validMethods = ['card', 'upi', 'cod', 'wallet'];
    const chosenMethod = payment_method && validMethods.includes(payment_method.toLowerCase())
      ? payment_method.toLowerCase()
      : 'card';

    connection = await db.getConnection();
    await connection.beginTransaction();

    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const productId = Number(item.product_id);
      const qty = Number(item.quantity);

      if (isNaN(productId) || isNaN(qty) || qty <= 0) {
        await connection.rollback();
        return fail(res, 400, 'Invalid product_id or quantity in order items');
      }

      // Lock product row
      const [prodRows] = await connection.query(
        'SELECT id, name, price, stock_quantity, is_active FROM products WHERE id = ? FOR UPDATE',
        [productId]
      );

      if (prodRows.length === 0 || !prodRows[0].is_active) {
        await connection.rollback();
        return fail(res, 400, `Product #${productId} is not available or inactive`);
      }

      const product = prodRows[0];

      if (product.stock_quantity < qty) {
        await connection.rollback();
        return fail(
          res,
          400,
          `Product "${product.name}" has insufficient stock (requested: ${qty}, available: ${product.stock_quantity})`
        );
      }

      const price = Number(product.price);
      totalAmount += price * qty;

      validatedItems.push({
        product_id: product.id,
        name: product.name,
        quantity: qty,
        price
      });
    }

    const isCod = chosenMethod === 'cod';
    const initialOrderStatus = isCod ? 'pending' : 'paid';
    const initialPaymentStatus = isCod ? 'pending' : 'success';

    // 1. Insert order
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, order_date, status, total_amount, shipping_address)
       VALUES (?, NOW(), ?, ?, ?)`,
      [
        req.user.id,
        initialOrderStatus,
        totalAmount,
        shipping_address.trim()
      ]
    );

    const orderId = orderResult.insertId;

    // 2. Insert order_items and decrease stock
    for (const item of validatedItems) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.price]
      );

      await connection.query(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // 3. Generate transaction ID (Rule 5)
    const transactionId = 'TXN' + Date.now() + Math.floor(1000 + Math.random() * 9000);

    // 4. Insert payment
    const [payResult] = await connection.query(
      `INSERT INTO payments (
         user_id, order_id, subscription_id, amount,
         payment_method, transaction_id, status, paid_at
       ) VALUES (?, ?, NULL, ?, ?, ?, ?, ${isCod ? 'NULL' : 'NOW()'})`,
      [
        req.user.id,
        orderId,
        totalAmount,
        chosenMethod,
        transactionId,
        initialPaymentStatus
      ]
    );

    await connection.commit();

    // 5. Notify user: "Order #id placed"
    await createNotification(req.user.id, 'order', `Order #${orderId} placed`);

    return ok(
      res,
      {
        order: {
          id: orderId,
          user_id: req.user.id,
          order_date: new Date(),
          status: initialOrderStatus,
          total_amount: totalAmount,
          shipping_address: shipping_address.trim(),
          items: validatedItems
        },
        payment: {
          id: payResult.insertId,
          order_id: orderId,
          amount: totalAmount,
          payment_method: chosenMethod,
          transaction_id: transactionId,
          status: initialPaymentStatus
        }
      },
      `Order #${orderId} placed successfully`,
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
    console.error('createOrder error:', error);
    return fail(res, 500, 'Failed to create order');
  } finally {
    if (connection) connection.release();
  }
};

/**
 * GET /api/orders/my (role: user)
 * User's orders newest first with an items array (product name, qty, price).
 */
const getMyOrders = async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.id, o.user_id, o.order_date, o.status, o.total_amount, o.shipping_address,
              p.transaction_id, p.payment_method, p.status AS payment_status
       FROM orders o
       LEFT JOIN payments p ON o.id = p.order_id
       WHERE o.user_id = ?
       ORDER BY o.order_date DESC, o.id DESC`,
      [req.user.id]
    );

    if (orders.length === 0) {
      return ok(res, []);
    }

    const orderIds = orders.map(o => o.id);
    const [items] = await db.query(
      `SELECT oi.id, oi.order_id, oi.product_id, pr.name AS product_name,
              oi.quantity AS qty, oi.price
       FROM order_items oi
       JOIN products pr ON oi.product_id = pr.id
       WHERE oi.order_id IN (?)
       ORDER BY oi.id ASC`,
      [orderIds]
    );

    const itemsByOrder = {};
    for (const item of items) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }

    const formatted = orders.map(o => ({
      ...o,
      items: itemsByOrder[o.id] || []
    }));

    return ok(res, formatted);
  } catch (error) {
    console.error('getMyOrders error:', error);
    return fail(res, 500, 'Failed to fetch user orders');
  }
};

/**
 * GET /api/orders/:id (owner or admin)
 */
const getOrderById = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) {
      return fail(res, 400, 'Invalid order ID');
    }

    const [rows] = await db.query(
      `SELECT o.id, o.user_id, o.order_date, o.status, o.total_amount, o.shipping_address,
              u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
              p.transaction_id, p.payment_method, p.status AS payment_status
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN payments p ON o.id = p.order_id
       WHERE o.id = ?`,
      [orderId]
    );

    if (rows.length === 0) {
      return fail(res, 404, 'Order not found');
    }

    const order = rows[0];

    // Only owner or admin can read it
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return fail(res, 403, 'Forbidden: You do not have permission to view this order');
    }

    const [items] = await db.query(
      `SELECT oi.id, oi.product_id, pr.name AS product_name,
              oi.quantity AS qty, oi.price
       FROM order_items oi
       JOIN products pr ON oi.product_id = pr.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    return ok(res, { ...order, items });
  } catch (error) {
    console.error('getOrderById error:', error);
    return fail(res, 500, 'Failed to fetch order');
  }
};

/**
 * PUT /api/orders/:id/cancel (owner only)
 * Only while status is pending or paid.
 * In ONE transaction:
 * - Restore stock for each item
 * - Set payment to failed if pending, otherwise keep it
 * - Set order status to cancelled
 */
const cancelOrder = async (req, res) => {
  let connection;
  try {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) {
      return fail(res, 400, 'Invalid order ID');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ? FOR UPDATE',
      [orderId, req.user.id]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      return fail(res, 404, 'Order not found');
    }

    const order = orderRows[0];

    if (order.status !== 'pending' && order.status !== 'paid') {
      await connection.rollback();
      return fail(res, 400, `Cannot cancel order with status "${order.status}"`);
    }

    // Restore stock
    const [items] = await connection.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
      [orderId]
    );

    for (const item of items) {
      await connection.query(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Set order status cancelled
    await connection.query(
      "UPDATE orders SET status = 'cancelled' WHERE id = ?",
      [orderId]
    );

    // Set payment to failed if pending
    await connection.query(
      "UPDATE payments SET status = 'failed' WHERE order_id = ? AND status = 'pending'",
      [orderId]
    );

    await connection.commit();

    await createNotification(req.user.id, 'order', `Order #${orderId} has been cancelled.`);

    return ok(res, { id: orderId, status: 'cancelled' }, 'Order cancelled successfully');
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('cancelOrder error:', error);
    return fail(res, 500, 'Failed to cancel order');
  } finally {
    if (connection) connection.release();
  }
};

/* ==========================================
   ADMIN ORDER CONTROLLERS
========================================== */

/**
 * GET /api/admin/orders (admin)
 * All orders with user name, items, payment info.
 */
const getAdminOrders = async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.id, o.user_id, u.name AS user_name, u.email AS user_email,
             o.order_date, o.status, o.total_amount, o.shipping_address,
             p.transaction_id, p.payment_method, p.status AS payment_status
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN payments p ON o.id = p.order_id
      ORDER BY o.order_date DESC, o.id DESC
    `);

    if (orders.length === 0) {
      return ok(res, []);
    }

    const orderIds = orders.map(o => o.id);
    const [items] = await db.query(
      `SELECT oi.id, oi.order_id, oi.product_id, pr.name AS product_name,
              oi.quantity AS qty, oi.price
       FROM order_items oi
       JOIN products pr ON oi.product_id = pr.id
       WHERE oi.order_id IN (?)
       ORDER BY oi.id ASC`,
      [orderIds]
    );

    const itemsByOrder = {};
    for (const item of items) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }

    const formatted = orders.map(o => ({
      ...o,
      items: itemsByOrder[o.id] || []
    }));

    return ok(res, formatted);
  } catch (error) {
    console.error('getAdminOrders error:', error);
    return fail(res, 500, 'Failed to fetch admin orders');
  }
};

/**
 * PUT /api/admin/orders/:id/status (admin)
 * Body: { status }
 * Allowed transitions:
 * - paid -> shipped
 * - shipped -> delivered
 * - pending -> paid (for COD confirmation, also sets payment to success and paid_at = NOW())
 * - any non-delivered -> cancelled (restores stock; if payment is pending, set to failed)
 * Notify user on every change.
 */
const updateOrderStatus = async (req, res) => {
  let connection;
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    if (isNaN(orderId)) {
      return fail(res, 400, 'Invalid order ID');
    }

    if (!status) {
      return fail(res, 400, 'status is required');
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      return fail(res, 404, 'Order not found');
    }

    const order = orderRows[0];
    const currentStatus = order.status;
    const targetStatus = String(status).trim().toLowerCase();

    // Check valid transitions
    let validTransition = false;

    if (currentStatus === 'paid' && targetStatus === 'shipped') {
      validTransition = true;
    } else if (currentStatus === 'shipped' && targetStatus === 'delivered') {
      validTransition = true;
    } else if (currentStatus === 'pending' && targetStatus === 'paid') {
      validTransition = true;
      // Also mark COD payment as success
      await connection.query(
        "UPDATE payments SET status = 'success', paid_at = NOW() WHERE order_id = ? AND status = 'pending'",
        [orderId]
      );
    } else if (currentStatus !== 'delivered' && targetStatus === 'cancelled') {
      validTransition = true;
      // Restore stock
      const [items] = await connection.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [orderId]
      );
      for (const item of items) {
        await connection.query(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
      // If payment was pending, mark failed
      await connection.query(
        "UPDATE payments SET status = 'failed' WHERE order_id = ? AND status = 'pending'",
        [orderId]
      );
    }

    if (!validTransition) {
      await connection.rollback();
      return fail(
        res,
        400,
        `Invalid status transition from "${currentStatus}" to "${targetStatus}". Allowed: paid->shipped, shipped->delivered, pending->paid, or non-delivered->cancelled`
      );
    }

    // Update order status
    await connection.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [targetStatus, orderId]
    );

    await connection.commit();

    // Notify user on every change
    await createNotification(
      order.user_id,
      'order',
      `Your order #${orderId} status has been updated to "${targetStatus}".`
    );

    const [updated] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    return ok(res, updated[0], `Order status updated to "${targetStatus}"`);
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Rollback error:', rbErr);
      }
    }
    console.error('updateOrderStatus error:', error);
    return fail(res, 500, 'Failed to update order status');
  } finally {
    if (connection) connection.release();
  }
};

/**
 * GET /api/admin/payments (admin)
 * All payments with user name, type ("subscription" or "order"), reference id,
 * amount, method, status, date; filter ?status=.
 */
const getAdminPayments = async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT 
        p.id,
        p.user_id,
        u.name AS user_name,
        u.email AS user_email,
        CASE 
          WHEN p.subscription_id IS NOT NULL THEN 'subscription'
          ELSE 'order'
        END AS type,
        COALESCE(p.subscription_id, p.order_id) AS reference_id,
        p.amount,
        p.payment_method AS method,
        p.transaction_id,
        p.status,
        p.paid_at AS date
      FROM payments p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY p.paid_at DESC, p.id DESC';

    const [rows] = await db.query(sql, params);
    return ok(res, rows);
  } catch (error) {
    console.error('getAdminPayments error:', error);
    return fail(res, 500, 'Failed to fetch admin payments');
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAdminOrders,
  updateOrderStatus,
  getAdminPayments
};
