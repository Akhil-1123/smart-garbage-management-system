const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const db = require('./src/config/db');

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

async function runTests() {
  const results = [];

  function record(testCase, passed, details) {
    results.push({ testCase, status: passed ? 'PASSED' : 'FAILED', details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testCase}: ${details}`);
  }

  try {
    console.log(`Starting Phase 4 verification against ${BASE_URL}...\n`);

    // 0. Health check
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    if (healthRes.status !== 200 || healthData.status !== 'ok') {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }

    // Login Admin
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sgms.com', password: 'Admin@123' })
    });
    const adminToken = (await adminLoginRes.json()).data.token;

    // Login Driver 1
    const d1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver1@sgms.com', password: 'Driver@123' })
    });
    const d1Token = (await d1LoginRes.json()).data.token;

    // Register User
    const userEmail = `market_user_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lakshmi Nair',
        email: userEmail,
        phone: '9847300003',
        password: 'Password@123',
        address: 'Market Road, Chengannur'
      })
    });
    const userToken = (await regRes.json()).data.token;

    // ----------------------------------------------------
    // CHECK 1: Filter products by category and search
    // ----------------------------------------------------
    const catSearchRes = await fetch(`${BASE_URL}/api/products?category_id=1&search=Bio`);
    const catSearchData = await catSearchRes.json();
    const productsList = catSearchData.data || [];

    const suggestRes = await fetch(`${BASE_URL}/api/products/suggest?use=vegetables`);
    const suggestData = await suggestRes.json();
    const suggestList = suggestData.data || [];

    const filterOk =
      catSearchRes.status === 200 &&
      productsList.length > 0 &&
      productsList.every(p => p.category_id === 1 && p.name.includes('Bio')) &&
      suggestRes.status === 200 &&
      suggestList.length > 0 &&
      suggestList.every(p => p.category_name === 'Vegetable Fertilizer');

    if (filterOk) {
      record(
        '1. Filter products by category and search',
        true,
        `Found ${productsList.length} filtered products (category 1, search "Bio") & ${suggestList.length} suggested products for "vegetables"`
      );
    } else {
      record('1. Filter products by category and search', false, `Filter result: ${JSON.stringify(productsList)}`);
    }

    // ----------------------------------------------------
    // CHECK 2: Place an order of 2 items and check the stock decreased
    // ----------------------------------------------------
    // Get product 1 and product 2 initial stock
    const [p1Before] = await db.query('SELECT id, name, price, stock_quantity FROM products WHERE id = 1');
    const [p2Before] = await db.query('SELECT id, name, price, stock_quantity FROM products WHERE id = 2');
    const p1InitialStock = Number(p1Before[0].stock_quantity);
    const p2InitialStock = Number(p2Before[0].stock_quantity);

    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        items: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 3 }
        ],
        shipping_address: 'Market Road, Chengannur',
        payment_method: 'card'
      })
    });
    const orderData = await orderRes.json();
    const order1Id = orderData.data ? orderData.data.order.id : null;

    const [p1After] = await db.query('SELECT stock_quantity FROM products WHERE id = 1');
    const [p2After] = await db.query('SELECT stock_quantity FROM products WHERE id = 2');
    const p1StockOk = Number(p1After[0].stock_quantity) === p1InitialStock - 2;
    const p2StockOk = Number(p2After[0].stock_quantity) === p2InitialStock - 3;

    if (orderRes.status === 201 && orderData.success && p1StockOk && p2StockOk) {
      record(
        '2. Place an order of 2 items and check stock decreased',
        true,
        `Order #${order1Id} placed (Total: ₹${orderData.data.order.total_amount}). Product #1: ${p1InitialStock}->${p1After[0].stock_quantity}, Product #2: ${p2InitialStock}->${p2After[0].stock_quantity}`
      );
    } else {
      record('2. Place an order of 2 items and check stock decreased', false, `Status: ${orderRes.status}, Error: ${JSON.stringify(orderData)}`);
    }

    // ----------------------------------------------------
    // CHECK 3: Ordering more than the stock gives 400
    // ----------------------------------------------------
    const overStockRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        items: [{ product_id: 1, quantity: 9999 }],
        shipping_address: 'Market Road, Chengannur',
        payment_method: 'upi'
      })
    });
    const overStockData = await overStockRes.json();

    if (overStockRes.status === 400 && overStockData.message.includes('stock')) {
      record(
        '3. Ordering more than the stock gives 400',
        true,
        `Correctly rejected with 400: "${overStockData.message}"`
      );
    } else {
      record('3. Ordering more than the stock gives 400', false, `Status: ${overStockRes.status}, Response: ${JSON.stringify(overStockData)}`);
    }

    // ----------------------------------------------------
    // CHECK 4: Cancel restores the stock
    // ----------------------------------------------------
    const cancelRes = await fetch(`${BASE_URL}/api/orders/${order1Id}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const cancelData = await cancelRes.json();

    const [p1Restored] = await db.query('SELECT stock_quantity FROM products WHERE id = 1');
    const [p2Restored] = await db.query('SELECT stock_quantity FROM products WHERE id = 2');
    const p1RestoredOk = Number(p1Restored[0].stock_quantity) === p1InitialStock;
    const p2RestoredOk = Number(p2Restored[0].stock_quantity) === p2InitialStock;

    if (cancelRes.status === 200 && cancelData.success && p1RestoredOk && p2RestoredOk) {
      record(
        '4. Cancel restores the stock',
        true,
        `Order #${order1Id} cancelled. Product #1 stock restored to ${p1Restored[0].stock_quantity}, Product #2 stock restored to ${p2Restored[0].stock_quantity}`
      );
    } else {
      record('4. Cancel restores the stock', false, `Status: ${cancelRes.status}, p1Restored: ${p1RestoredOk}, p2Restored: ${p2RestoredOk}`);
    }

    // ----------------------------------------------------
    // CHECK 5: Admin moves the order paid->shipped->delivered
    // ----------------------------------------------------
    // User places a new order
    const order2Res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        items: [{ product_id: 1, quantity: 1 }],
        shipping_address: 'Market Road, Chengannur',
        payment_method: 'card'
      })
    });
    const order2Id = (await order2Res.json()).data.order.id;

    // Admin moves to shipped
    const shipRes = await fetch(`${BASE_URL}/api/admin/orders/${order2Id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'shipped' })
    });
    const shipData = await shipRes.json();
    const shipOk = shipRes.status === 200 && shipData.data.status === 'shipped';

    // Admin moves to delivered
    const deliverRes = await fetch(`${BASE_URL}/api/admin/orders/${order2Id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'delivered' })
    });
    const deliverData = await deliverRes.json();
    const deliverOk = deliverRes.status === 200 && deliverData.data.status === 'delivered';

    if (shipOk && deliverOk) {
      record(
        '5. Admin moves the order paid->shipped->delivered',
        true,
        `Order #${order2Id} transitioned paid -> shipped -> delivered successfully`
      );
    } else {
      record('5. Admin moves the order paid->shipped->delivered', false, `shipOk: ${shipOk}, deliverOk: ${deliverOk}`);
    }

    // ----------------------------------------------------
    // CHECK 6: Invalid transition gives 400
    // ----------------------------------------------------
    // From delivered, moving to shipped or pending or cancelled should fail
    const invalidTransRes = await fetch(`${BASE_URL}/api/admin/orders/${order2Id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'cancelled' })
    });
    const invalidTransData = await invalidTransRes.json();

    if (invalidTransRes.status === 400 && !invalidTransData.success) {
      record(
        '6. Invalid transition gives 400',
        true,
        `Correctly rejected with 400: "${invalidTransData.message}"`
      );
    } else {
      record('6. Invalid transition gives 400', false, `Status: ${invalidTransRes.status}, Response: ${JSON.stringify(invalidTransData)}`);
    }

    // ----------------------------------------------------
    // Setup a completed collection request for feedback testing
    // ----------------------------------------------------
    // User subscribes
    const plansRes = await fetch(`${BASE_URL}/api/subscription-plans`);
    const monthlyPlan = (await plansRes.json()).data.find(p => p.plan_type === 'monthly');
    await fetch(`${BASE_URL}/api/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ plan_id: monthlyPlan.id, payment_method: 'card' })
    });

    // User creates bin and sets full
    const binRes = await fetch(`${BASE_URL}/api/bins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ location: 'Market Road', latitude: 9.3160, longitude: 76.6150, capacity_kg: 20 })
    });
    const binId = (await binRes.json()).data.id;
    await fetch(`${BASE_URL}/api/bins/${binId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
      body: JSON.stringify({ fill_status: 'full' })
    });

    // Create collection request
    const colReqRes = await fetch(`${BASE_URL}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
      body: JSON.stringify({ bin_id: binId, waste_type: 'organic', address: 'Market Road' })
    });
    const colReqId = (await colReqRes.json()).data.id;

    // ----------------------------------------------------
    // CHECK 8: Feedback on a non-collected request gives 400
    // ----------------------------------------------------
    // Request is still pending
    const fbNonColRes = await fetch(`${BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
      body: JSON.stringify({
        type: 'feedback',
        collection_id: colReqId,
        rating: 5,
        message: 'Great service'
      })
    });
    const fbNonColData = await fbNonColRes.json();

    if (fbNonColRes.status === 400 && fbNonColData.message.includes('collected')) {
      record(
        '8. Feedback on a non-collected request gives 400',
        true,
        `Correctly rejected with 400: "${fbNonColData.message}"`
      );
    } else {
      record('8. Feedback on a non-collected request gives 400', false, `Status: ${fbNonColRes.status}, Response: ${JSON.stringify(fbNonColData)}`);
    }

    // Now complete the collection request
    await fetch(`${BASE_URL}/api/admin/collections/${colReqId}/approve`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    await fetch(`${BASE_URL}/api/admin/collections/${colReqId}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ driver_id: 1 })
    });
    await fetch(`${BASE_URL}/api/driver/collections/${colReqId}/collect`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${d1Token}` },
      body: JSON.stringify({ weight_kg: 10.0 })
    });

    // ----------------------------------------------------
    // CHECK 7: Feedback for a collected request works and duplicate gives 400
    // ----------------------------------------------------
    const fbRes = await fetch(`${BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
      body: JSON.stringify({
        type: 'feedback',
        collection_id: colReqId,
        rating: 5,
        message: 'Prompt and courteous driver pickup!'
      })
    });
    const fbData = await fbRes.json();
    const fbCreated = fbRes.status === 201 && fbData.success && fbData.data.driver_id === 1;

    // Duplicate feedback attempt
    const dupFbRes = await fetch(`${BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
      body: JSON.stringify({
        type: 'feedback',
        collection_id: colReqId,
        rating: 4,
        message: 'Trying duplicate feedback'
      })
    });
    const dupFbData = await dupFbRes.json();
    const dupFbBlocked = dupFbRes.status === 400 && dupFbData.message.includes('already');

    if (fbCreated && dupFbBlocked) {
      record(
        '7. Feedback for collected request works and duplicate gives 400',
        true,
        `Feedback submitted (rating 5/5, driver_id: 1); duplicate submission rejected with 400: "${dupFbData.message}"`
      );
    } else {
      record('7. Feedback for collected request works and duplicate gives 400', false, `fbCreated: ${fbCreated}, dupFbBlocked: ${dupFbBlocked}`);
    }

    // ----------------------------------------------------
    // CHECK 9: A complaint works and admin responds
    // ----------------------------------------------------
    const compRes = await fetch(`${BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
      body: JSON.stringify({
        type: 'complaint',
        message: 'Collection truck arrived 30 minutes after scheduled notification.'
      })
    });
    const compData = await compRes.json();
    const complaintId = compData.data ? compData.data.id : null;

    // Admin responds
    const adminRespRes = await fetch(`${BASE_URL}/api/admin/feedback/${complaintId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: 'resolved',
        admin_response: 'Investigated with dispatch team. Route congestion delayed the vehicle.'
      })
    });
    const adminRespData = await adminRespRes.json();
    const adminRespOk = adminRespRes.status === 200 && adminRespData.data.status === 'resolved';

    if (compRes.status === 201 && adminRespOk) {
      record(
        '9. A complaint works and admin responds',
        true,
        `Complaint #${complaintId} submitted; Admin responded and resolved status updated`
      );
    } else {
      record('9. A complaint works and admin responds', false, `compRes: ${compRes.status}, adminResp: ${adminRespRes.status}`);
    }

    // ----------------------------------------------------
    // CHECK 10: Notifications list and read-all work
    // ----------------------------------------------------
    const notifBeforeRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const notifBeforeData = await notifBeforeRes.json();
    const hasUnread = notifBeforeData.data && notifBeforeData.data.unread_count > 0;

    // Read all
    const readAllRes = await fetch(`${BASE_URL}/api/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    const notifAfterRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const notifAfterData = await notifAfterRes.json();
    const allMarkedRead = notifAfterData.data && notifAfterData.data.unread_count === 0;

    if (hasUnread && readAllRes.status === 200 && allMarkedRead) {
      record(
        '10. Notifications list and read-all work',
        true,
        `Initial unread count: ${notifBeforeData.data.unread_count}, after read-all unread count: 0`
      );
    } else {
      record('10. Notifications list and read-all work', false, `hasUnread: ${hasUnread}, allMarkedRead: ${allMarkedRead}`);
    }

    // ----------------------------------------------------
    // CHECK 11: The dashboard and monthly report return valid numbers
    // ----------------------------------------------------
    const dashRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const dashData = await dashRes.json();
    const dash = dashData.data || {};

    const repRes = await fetch(`${BASE_URL}/api/admin/reports/monthly`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const repData = await repRes.json();
    const rep = repData.data || {};

    const exportRes = await fetch(`${BASE_URL}/api/admin/reports/export`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const isCsv = (exportRes.headers.get('content-type') || '').includes('text/csv');

    const dashValid =
      dash.total_users > 0 &&
      dash.total_drivers >= 3 &&
      dash.total_waste_kg > 0 &&
      dash.total_orders > 0 &&
      dash.requests_by_status !== undefined &&
      Array.isArray(dash.waste_by_type) &&
      Array.isArray(dash.monthly_waste);

    const repValid =
      rep.collections_count > 0 &&
      rep.total_kg > 0 &&
      rep.revenue > 0 &&
      Array.isArray(rep.by_type) &&
      Array.isArray(rep.by_driver);

    if (dashRes.status === 200 && repRes.status === 200 && exportRes.status === 200 && dashValid && repValid && isCsv) {
      record(
        '11. The dashboard and monthly report return valid numbers',
        true,
        `Dashboard: ${dash.total_users} users, ${dash.total_waste_kg} kg waste, ₹${rep.revenue} revenue, CSV export confirmed`
      );
    } else {
      record(
        '11. The dashboard and monthly report return valid numbers',
        false,
        `dashValid: ${dashValid}, repValid: ${repValid}, isCsv: ${isCsv}`
      );
    }

    console.log('\n======================================================');
    console.log('PHASE 4 VERIFICATION SUMMARY TABLE');
    console.log('======================================================');
    console.table(results);

    const hasFailed = results.some(r => r.status === 'FAILED');
    if (hasFailed) {
      console.error('\nOne or more checks failed!');
      process.exit(1);
    } else {
      console.log('\nALL 11 CHECKS PASSED PERFECTLY!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
