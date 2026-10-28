const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../src/config/db');
const { runSubscriptionExpiryNotifications } = require('../src/utils/subscriptions');

async function createExpiryUsers() {
  console.log('--- Creating Users With Ending Subscriptions ---');

  const demoUserPassword = 'User@123';
  const demoUserPasswordHash = await bcrypt.hash(demoUserPassword, 10);

  const usersToCreate = [
    {
      name: 'Expiry Demo 7 Days',
      email: 'expiry7@sgms.com',
      phone: '9000000007',
      daysUntilEnd: 7,
      description: '7 days before end of subscription'
    },
    {
      name: 'Expiry Demo 5 Days',
      email: 'expiry5@sgms.com',
      phone: '9000000005',
      daysUntilEnd: 5,
      description: '5 days before end of subscription'
    },
    {
      name: 'Expiry Demo 3 Days',
      email: 'expiry3@sgms.com',
      phone: '9000000003',
      daysUntilEnd: 3,
      description: '3 days before end of subscription'
    },
    {
      name: 'Expiry Demo 1 Day',
      email: 'expiry1@sgms.com',
      phone: '9000000001',
      daysUntilEnd: 1,
      description: '1 day before end of subscription (ends tomorrow)'
    },
    {
      name: 'Expiry Demo Ends Today',
      email: 'expiry0@sgms.com',
      phone: '9000000000',
      daysUntilEnd: 0,
      description: 'Day of expiry (ends today)'
    },
    {
      name: 'Expiry Demo Expired Yesterday',
      email: 'expired@sgms.com',
      phone: '9000000009',
      daysUntilEnd: -1,
      description: '1 day after end of subscription (expired yesterday)'
    },
    {
      name: 'Expiry Demo Expired 3 Days Ago',
      email: 'expired3@sgms.com',
      phone: '9000000008',
      daysUntilEnd: -3,
      description: '3 days after end of subscription (expired 3 days ago)'
    }
  ];

  try {
    const [roles] = await db.query("SELECT id FROM roles WHERE name = 'user'");
    const roleId = roles[0].id;

    const [plans] = await db.query("SELECT id, price FROM subscription_plans WHERE name = 'Monthly Plan'");
    const planId = plans[0].id;
    const planPrice = plans[0].price;

    for (const u of usersToCreate) {
      // 1. Insert or update user
      const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [u.email]);
      let userId;

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        await db.query(
          `UPDATE users SET name = ?, phone = ?, password_hash = ?, is_active = TRUE WHERE id = ?`,
          [u.name, u.phone, demoUserPasswordHash, userId]
        );
        console.log(`Updated existing user ${u.email} (ID: ${userId})`);
      } else {
        const [insertRes] = await db.query(
          `INSERT INTO users (role_id, name, email, phone, password_hash, address, is_active)
           VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
          [roleId, u.name, u.email, u.phone, demoUserPasswordHash, 'SGMS Ward 4, Chengannur, Kerala']
        );
        userId = insertRes.insertId;
        console.log(`Created user ${u.email} (ID: ${userId})`);
      }

      // 2. Remove previous subscriptions/payments for clean state
      await db.query('DELETE FROM payments WHERE user_id = ?', [userId]);
      await db.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
      await db.query('DELETE FROM subscriptions WHERE user_id = ?', [userId]);

      // 3. Insert subscription with exact end date
      const status = u.daysUntilEnd < 0 ? 'expired' : 'active';
      const [subRes] = await db.query(
        `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status, amount)
         VALUES (?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, ?)`,
        [userId, planId, 30 - u.daysUntilEnd, u.daysUntilEnd, status, planPrice]
      );
      const subscriptionId = subRes.insertId;

      // 4. Insert mock payment
      const txnId = 'TXN_SUB_' + Date.now() + Math.floor(1000 + Math.random() * 9000);
      await db.query(
        `INSERT INTO payments (user_id, subscription_id, amount, payment_method, transaction_id, status, paid_at)
         VALUES (?, ?, ?, 'upi', ?, 'success', DATE_SUB(CURDATE(), INTERVAL ? DAY))`,
        [userId, subscriptionId, planPrice, txnId, 30 - u.daysUntilEnd]
      );
    }

    console.log('\nRunning subscription expiry notification generator...');
    const count = await runSubscriptionExpiryNotifications();
    console.log(`Generated ${count} notification(s).\n`);

    console.log('--- Verification Summary ---');
    for (const u of usersToCreate) {
      const [userRows] = await db.query(
        `SELECT u.id, u.email, s.start_date, s.end_date, s.status,
                DATEDIFF(s.end_date, CURDATE()) AS days_left
         FROM users u
         JOIN subscriptions s ON u.id = s.user_id
         WHERE u.email = ?`,
        [u.email]
      );

      const [notifs] = await db.query(
        `SELECT id, message, created_at, is_read
         FROM notifications
         WHERE user_id = ?
         ORDER BY id DESC`,
        [userRows[0].id]
      );

      console.log(`User: ${u.email}`);
      console.log(`  Password:   ${demoUserPassword}`);
      console.log(`  Description:${u.description}`);
      console.log(`  End Date:   ${userRows[0].end_date.toISOString ? userRows[0].end_date.toISOString().slice(0, 10) : userRows[0].end_date} (Days left: ${userRows[0].days_left})`);
      console.log(`  Status:     ${userRows[0].status}`);
      console.log(`  Notification: "${notifs[0]?.message || 'None'}"`);
      console.log('');
    }

    console.log('All expiry users created and tested successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create expiry users:', error);
    process.exit(1);
  }
}

createExpiryUsers();
