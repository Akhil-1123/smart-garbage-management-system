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
    console.log(`Starting Phase 3 verification against ${BASE_URL}...\n`);

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
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.data.token;

    // Login Driver 1 and Driver 2
    const d1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver1@sgms.com', password: 'Driver@123' })
    });
    const d1Token = (await d1LoginRes.json()).data.token;

    const d2LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver2@sgms.com', password: 'Driver@123' })
    });
    const d2Token = (await d2LoginRes.json()).data.token;

    // Setup Subscribed User (User 1)
    const user1Email = `user1_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Suresh Pillai',
        email: user1Email,
        phone: '9447100001',
        password: 'Password@123',
        address: 'MG Road, Chengannur'
      })
    });
    const user1Data = await regRes.json();
    const user1Token = user1Data.data.token;
    const user1Id = user1Data.data.user.id;

    // User 1 subscribes to Monthly Plan
    const plansRes = await fetch(`${BASE_URL}/api/subscription-plans`);
    const plansData = await plansRes.json();
    const monthlyPlan = plansData.data.find(p => p.plan_type === 'monthly');

    await fetch(`${BASE_URL}/api/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({ plan_id: monthlyPlan.id, payment_method: 'card' })
    });

    // User 1 creates bin and sets it to full
    const binRes = await fetch(`${BASE_URL}/api/bins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        location: 'MG Road, Chengannur',
        latitude: 9.3160,
        longitude: 76.6150,
        bin_type: 'organic',
        capacity_kg: 20
      })
    });
    const binData = await binRes.json();
    const bin1Id = binData.data.id;

    // Set bin status to full
    await fetch(`${BASE_URL}/api/bins/${bin1Id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({ fill_status: 'full' })
    });

    // ----------------------------------------------------
    // CHECK 1: User (subscribed, bin full) creates a request
    // ----------------------------------------------------
    const createReqRes = await fetch(`${BASE_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        bin_id: bin1Id,
        waste_type: 'organic',
        address: 'MG Road, Chengannur',
        latitude: 9.3160,
        longitude: 76.6150,
        remarks: 'Please collect organic kitchen waste'
      })
    });
    const createReqData = await createReqRes.json();
    const collectionId = createReqData.data ? createReqData.data.id : null;

    if (createReqRes.status === 201 && createReqData.success && createReqData.data.status === 'pending') {
      record('1. User (subscribed, bin full) creates a request', true, `Request ID ${collectionId} created with status pending`);
    } else {
      record('1. User (subscribed, bin full) creates a request', false, `Status: ${createReqRes.status}, Error: ${JSON.stringify(createReqData)}`);
    }

    // ----------------------------------------------------
    // CHECK 2: A second request for the same bin is rejected
    // ----------------------------------------------------
    const secondReqRes = await fetch(`${BASE_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        bin_id: bin1Id,
        waste_type: 'organic',
        address: 'MG Road, Chengannur',
        latitude: 9.3160,
        longitude: 76.6150
      })
    });
    const secondReqData = await secondReqRes.json();

    if (secondReqRes.status === 400 && !secondReqData.success) {
      record('2. A second request for the same bin is rejected', true, `Correctly rejected with 400: "${secondReqData.message}"`);
    } else {
      record('2. A second request for the same bin is rejected', false, `Status: ${secondReqRes.status}, Response: ${JSON.stringify(secondReqData)}`);
    }

    // ----------------------------------------------------
    // CHECK 3: An unsubscribed user is rejected
    // ----------------------------------------------------
    const user2Email = `unsub_${Date.now()}@example.com`;
    const reg2Res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unsubscribed User',
        email: user2Email,
        phone: '9447200002',
        password: 'Password@123',
        address: 'Station Road, Thiruvalla'
      })
    });
    const user2Token = (await reg2Res.json()).data.token;

    // User 2 creates bin and sets it to full (no subscription)
    const bin2Res = await fetch(`${BASE_URL}/api/bins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user2Token}`
      },
      body: JSON.stringify({
        location: 'Station Road, Thiruvalla',
        latitude: 9.3840,
        longitude: 76.5740,
        bin_type: 'organic',
        capacity_kg: 20
      })
    });
    const bin2Id = (await bin2Res.json()).data.id;
    await fetch(`${BASE_URL}/api/bins/${bin2Id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user2Token}`
      },
      body: JSON.stringify({ fill_status: 'full' })
    });

    const unsubReqRes = await fetch(`${BASE_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user2Token}`
      },
      body: JSON.stringify({
        bin_id: bin2Id,
        waste_type: 'organic',
        address: 'Station Road, Thiruvalla',
        latitude: 9.3840,
        longitude: 76.5740
      })
    });
    const unsubReqData = await unsubReqRes.json();

    if (unsubReqRes.status === 400 && unsubReqData.message.includes('subscribe')) {
      record('3. An unsubscribed user is rejected', true, `Correctly rejected with 400: "${unsubReqData.message}"`);
    } else {
      record('3. An unsubscribed user is rejected', false, `Status: ${unsubReqRes.status}, Response: ${JSON.stringify(unsubReqData)}`);
    }

    // ----------------------------------------------------
    // CHECK 4: Admin approves
    // ----------------------------------------------------
    const approveRes = await fetch(`${BASE_URL}/api/admin/collections/${collectionId}/approve`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const approveData = await approveRes.json();

    if (approveRes.status === 200 && approveData.success && approveData.data.status === 'approved') {
      record('4. Admin approves', true, `Request #${collectionId} status updated to approved`);
    } else {
      record('4. Admin approves', false, `Status: ${approveRes.status}, Response: ${JSON.stringify(approveData)}`);
    }

    // ----------------------------------------------------
    // CHECK 5: nearby-drivers returns sorted drivers
    // ----------------------------------------------------
    const nearbyRes = await fetch(`${BASE_URL}/api/admin/collections/${collectionId}/nearby-drivers`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const nearbyData = await nearbyRes.json();
    const driverList = nearbyData.data || [];

    const isSorted = driverList.every((d, i, arr) => i === 0 || d.distance_km >= arr[i - 1].distance_km);
    const hasRec = driverList.length > 0 && driverList[0].recommended === true;

    if (nearbyRes.status === 200 && driverList.length > 0 && isSorted && hasRec) {
      record(
        '5. nearby-drivers returns sorted drivers',
        true,
        `Returned ${driverList.length} drivers sorted by distance (${driverList[0].name} closest at ${driverList[0].distance_km} km, recommended: true)`
      );
    } else {
      record('5. nearby-drivers returns sorted drivers', false, `Status: ${nearbyRes.status}, isSorted: ${isSorted}, hasRec: ${hasRec}, Count: ${driverList.length}`);
    }

    // ----------------------------------------------------
    // CHECK 6: Admin assigns driver1
    // ----------------------------------------------------
    // Driver 1 ID is 1 (Rajesh Kumar)
    const assignRes = await fetch(`${BASE_URL}/api/admin/collections/${collectionId}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ driver_id: 1 })
    });
    const assignData = await assignRes.json();

    if (assignRes.status === 200 && assignData.success && assignData.data.status === 'driver_assigned' && assignData.data.driver_id === 1) {
      record('6. Admin assigns driver1', true, `Request #${collectionId} assigned to driver 1 with status driver_assigned`);
    } else {
      record('6. Admin assigns driver1', false, `Status: ${assignRes.status}, Response: ${JSON.stringify(assignData)}`);
    }

    // ----------------------------------------------------
    // CHECK 7: driver1 sees it and a different driver gets 403 trying to collect it
    // ----------------------------------------------------
    const d1TasksRes = await fetch(`${BASE_URL}/api/driver/collections`, {
      headers: { 'Authorization': `Bearer ${d1Token}` }
    });
    const d1Tasks = await d1TasksRes.json();
    const d1SeesIt = (d1Tasks.data || []).some(t => t.id === collectionId && t.google_maps_url);

    // Driver 2 attempts collection -> expect 403
    const d2CollectRes = await fetch(`${BASE_URL}/api/driver/collections/${collectionId}/collect`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${d2Token}`
      },
      body: JSON.stringify({ weight_kg: 7.5 })
    });
    const d2CollectData = await d2CollectRes.json();
    const d2Blocked403 = d2CollectRes.status === 403;

    if (d1SeesIt && d2Blocked403) {
      record(
        '7. driver1 sees it and a different driver gets 403 trying to collect it',
        true,
        `Driver 1 sees request with google_maps_url; Driver 2 blocked with 403: "${d2CollectData.message}"`
      );
    } else {
      record('7. driver1 sees it and a different driver gets 403 trying to collect it', false, `d1SeesIt: ${d1SeesIt}, d2Blocked403: ${d2Blocked403} (${d2CollectRes.status})`);
    }

    // ----------------------------------------------------
    // CHECK 8: driver1 collects 7.5 kg
    // ----------------------------------------------------
    const d1CollectRes = await fetch(`${BASE_URL}/api/driver/collections/${collectionId}/collect`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${d1Token}`
      },
      body: JSON.stringify({ weight_kg: 7.5, notes: 'Organic waste verified and collected' })
    });
    const d1CollectData = await d1CollectRes.json();
    const wasteRecord = d1CollectData.data;

    if (d1CollectRes.status === 200 && d1CollectData.success && wasteRecord && Number(wasteRecord.weight_kg) === 7.5) {
      record('8. driver1 collects 7.5 kg', true, `Collection marked collected, waste_record #${wasteRecord.id} created with 7.5 kg`);
    } else {
      record('8. driver1 collects 7.5 kg', false, `Status: ${d1CollectRes.status}, Response: ${JSON.stringify(d1CollectData)}`);
    }

    // ----------------------------------------------------
    // CHECK 9: the bin becomes empty
    // ----------------------------------------------------
    const checkBinRes = await fetch(`${BASE_URL}/api/bins/my`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const userBins = (await checkBinRes.json()).data || [];
    const bin1Updated = userBins.find(b => b.id === bin1Id);

    // Also check history has "Empty"
    const histRes = await fetch(`${BASE_URL}/api/bins/${bin1Id}/history`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const histData = (await histRes.json()).data || [];
    const latestHist = histData[0];

    const binIsEmpty = bin1Updated && bin1Updated.fill_status === 'empty' && Number(bin1Updated.current_level) === 0;
    const histIsEmpty = latestHist && latestHist.status === 'Empty' && Number(latestHist.level) === 0;

    if (binIsEmpty && histIsEmpty) {
      record('9. The bin becomes empty', true, `Bin fill_status is "empty", level 0%, history row "Empty" recorded`);
    } else {
      record('9. The bin becomes empty', false, `binIsEmpty: ${binIsEmpty}, histIsEmpty: ${histIsEmpty}`);
    }

    // ----------------------------------------------------
    // CHECK 10: the user has a notification
    // ----------------------------------------------------
    const [userNotes] = await db.query(
      `SELECT message FROM notifications 
       WHERE user_id = ? AND message LIKE '%collected (7.5 kg)%'
       ORDER BY id DESC LIMIT 1`,
      [user1Id]
    );

    if (userNotes.length > 0) {
      record('10. The user has a notification', true, `Notification found: "${userNotes[0].message}"`);
    } else {
      record('10. The user has a notification', false, 'Expected collection notification not found in notifications table');
    }

    // ----------------------------------------------------
    // CHECK 11: admin creates a batch from that waste, completes it with 5 kg for a product, and the product stock increases by 5
    // ----------------------------------------------------
    // Get initial stock for product 1
    const [initProd] = await db.query('SELECT id, name, stock_quantity FROM products WHERE id = 1');
    const initialStock = Number(initProd[0].stock_quantity);

    // Create batch with the waste record
    const createBatchRes = await fetch(`${BASE_URL}/api/admin/composting/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        unit_id: 1,
        waste_record_ids: [wasteRecord.id]
      })
    });
    const createBatchData = await createBatchRes.json();
    const batchId = createBatchData.data ? createBatchData.data.id : null;
    const batchCode = createBatchData.data ? createBatchData.data.batch_code : null;

    // Complete batch with 5 kg for product 1
    const completeBatchRes = await fetch(`${BASE_URL}/api/admin/composting/batches/${batchId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        output_weight_kg: 5.0,
        product_id: 1
      })
    });
    const completeBatchData = await completeBatchRes.json();

    // Check new product stock
    const [finalProd] = await db.query('SELECT stock_quantity FROM products WHERE id = 1');
    const finalStock = Number(finalProd[0].stock_quantity);
    const stockIncreasedBy5 = finalStock === initialStock + 5;

    if (createBatchRes.status === 201 && completeBatchRes.status === 200 && stockIncreasedBy5) {
      record(
        '11. Admin creates a batch, completes it with 5 kg, product stock increases by 5',
        true,
        `Batch ${batchCode} (ID ${batchId}) processed 7.5 kg into 5 kg; Product #${initProd[0].id} stock increased from ${initialStock} to ${finalStock}`
      );
    } else {
      record(
        '11. Admin creates a batch, completes it with 5 kg, product stock increases by 5',
        false,
        `createBatch: ${createBatchRes.status}, completeBatch: ${completeBatchRes.status}, stockIncreasedBy5: ${stockIncreasedBy5} (${initialStock} -> ${finalStock})`
      );
    }

    console.log('\n======================================================');
    console.log('PHASE 3 VERIFICATION SUMMARY TABLE');
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
