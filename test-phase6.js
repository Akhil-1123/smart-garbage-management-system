const VITE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
    passCount++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    failCount++;
  }
}

async function apiRequest(url, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

async function runPhase6Tests() {
  console.log('\n======================================================');
  console.log('   STARTING PHASE 6 DEFINITION OF DONE VERIFICATION   ');
  console.log('======================================================\n');

  try {
    // ----------------------------------------------------
    // STEP 1: Register new citizen user
    // ----------------------------------------------------
    console.log('[Test 1] Citizen Registration & Login');
    const userEmail = `citizen_p6_${Date.now()}@example.com`;
    const regRes = await apiRequest(`${VITE_URL}/api/auth/register`, 'POST', {
      name: 'Ramesh Varma',
      email: userEmail,
      phone: '9847012345',
      address: 'Haritha Nagar, House 14, Chengannur',
      password: 'Password@123'
    });
    assert(regRes.status === 201 && regRes.data.success, 'Citizen registered successfully');
    const userToken = regRes.data.data.token;
    assert(!!userToken, 'Received JWT auth token');

    // ----------------------------------------------------
    // STEP 2: Status Checker Initial State (No sub, no bins)
    // ----------------------------------------------------
    console.log('\n[Test 2] Request Collection Status Checker (Initial: No subscription)');
    const subsInitial = await apiRequest(`${VITE_URL}/api/subscriptions/my`, 'GET', null, userToken);
    const hasSubInitial = subsInitial.data.data.some(s => s.is_current || s.status === 'active');
    assert(!hasSubInitial, 'Pre-condition verified: Citizen has NO active subscription');

    // ----------------------------------------------------
    // STEP 3: Subscribe to Monthly Plan
    // ----------------------------------------------------
    console.log('\n[Test 3] Subscribe to Plan with Mock Payment');
    const plansRes = await apiRequest(`${VITE_URL}/api/subscription-plans`);
    const monthlyPlan = plansRes.data.data[0];
    const subRes = await apiRequest(
      `${VITE_URL}/api/subscriptions`,
      'POST',
      { plan_id: monthlyPlan.id, payment_method: 'upi' },
      userToken
    );
    assert(subRes.status === 201 && subRes.data.data.subscription?.status === 'active', 'Subscribed to plan successfully');

    const subsAfter = await apiRequest(`${VITE_URL}/api/subscriptions/my`, 'GET', null, userToken);
    const hasSubAfter = subsAfter.data.data.some(s => s.is_current || s.status === 'active');
    assert(hasSubAfter, 'Checker Line 1 "Active subscription" switched to TRUE');

    // ----------------------------------------------------
    // STEP 4: Add Smart Bin & Update to Full
    // ----------------------------------------------------
    console.log('\n[Test 4] Add Smart Bin and Set Fill Status to Full');
    const addBinRes = await apiRequest(
      `${VITE_URL}/api/bins`,
      'POST',
      {
        location: 'Backyard Kitchen Gate',
        bin_type: 'organic',
        capacity_kg: 30,
        latitude: 9.3175,
        longitude: 76.618
      },
      userToken
    );
    assert(addBinRes.status === 201, 'Smart bin added with GPS coordinates');
    const binId = addBinRes.data.data.id;

    // Set to full
    const fullRes = await apiRequest(
      `${VITE_URL}/api/bins/${binId}/status`,
      'PUT',
      { fill_status: 'full' },
      userToken
    );
    const updatedBin = fullRes.data.data.bin || fullRes.data.data;
    assert(updatedBin.fill_status === 'full' && Number(updatedBin.current_level) === 100, 'Bin fill status updated to FULL (100%)');
    assert(!updatedBin.has_open_request, 'Checker Line 3 "No open request for this bin" is TRUE');

    // ----------------------------------------------------
    // STEP 5: Submit Collection Request 1
    // ----------------------------------------------------
    console.log('\n[Test 5] Submit Collection Request 1 for Full Bin');
    const req1Res = await apiRequest(
      `${VITE_URL}/api/collections`,
      'POST',
      {
        bin_id: binId,
        waste_type: 'organic',
        address: 'Backyard Kitchen Gate, Haritha Nagar 14',
        latitude: 9.3175,
        longitude: 76.618,
        remarks: 'Bin is Full of vegetable scraps'
      },
      userToken
    );
    assert(req1Res.status === 201 && req1Res.data.success, 'Collection request #1 created with status pending');
    const req1Id = req1Res.data.data.id;

    // ----------------------------------------------------
    // STEP 6: Try to submit second request for same bin -> Must be blocked!
    // ----------------------------------------------------
    console.log('\n[Test 6] Attempt Second Request for Same Bin (Must be blocked)');
    const req2Res = await apiRequest(
      `${VITE_URL}/api/collections`,
      'POST',
      {
        bin_id: binId,
        waste_type: 'organic',
        address: 'Backyard Kitchen Gate',
        latitude: 9.3175,
        longitude: 76.618
      },
      userToken
    );
    assert(req2Res.status === 400 && !req2Res.data.success, 'Second collection request correctly BLOCKED with 400 Bad Request');
    assert(req2Res.data.message.toLowerCase().includes('already') || req2Res.data.message.toLowerCase().includes('open'), 'Blocked reason message confirms open request exists');

    // ----------------------------------------------------
    // STEP 7: Cancel Request 1
    // ----------------------------------------------------
    console.log('\n[Test 7] Cancel Open Collection Request');
    const cancelReqRes = await apiRequest(
      `${VITE_URL}/api/collections/${req1Id}/cancel`,
      'PUT',
      null,
      userToken
    );
    assert(cancelReqRes.status === 200 && cancelReqRes.data.success, `Collection request #${req1Id} cancelled successfully`);

    const myReqs = await apiRequest(`${VITE_URL}/api/collections/my`, 'GET', null, userToken);
    const cancelledReq = myReqs.data.data.find(r => r.id === req1Id);
    assert(cancelledReq?.status === 'cancelled', 'Request status in /api/collections/my is "cancelled"');

    // ----------------------------------------------------
    // STEP 8: Marketplace - Add 2 Products to Cart & Checkout with UPI
    // ----------------------------------------------------
    console.log('\n[Test 8] Marketplace: Add 2 Products to Cart & Checkout (Order Flow)');
    const productsRes = await apiRequest(`${VITE_URL}/api/products`);
    assert(productsRes.data.data.length >= 2, 'Marketplace products catalog loaded');
    const prod1 = productsRes.data.data[0];
    const prod2 = productsRes.data.data[1];
    const initialStock1 = Number(prod1.stock_quantity);
    const initialStock2 = Number(prod2.stock_quantity);

    const orderRes = await apiRequest(
      `${VITE_URL}/api/orders`,
      'POST',
      {
        items: [
          { product_id: prod1.id, quantity: 2 },
          { product_id: prod2.id, quantity: 1 }
        ],
        shipping_address: 'Haritha Nagar 14, Chengannur',
        payment_method: 'upi'
      },
      userToken
    );
    assert(orderRes.status === 201 && orderRes.data.success, 'Order placed successfully with UPI mock payment');
    const createdOrder = orderRes.data.data.order;
    assert(createdOrder?.status === 'paid', 'Order status is "paid"');
    assert(orderRes.data.data.payment?.transaction_id?.startsWith('TXN'), 'Mock payment generated "TXN..." transaction reference');

    // Check stock decreased
    const prod1AfterOrder = await apiRequest(`${VITE_URL}/api/products/${prod1.id}`);
    const prod2AfterOrder = await apiRequest(`${VITE_URL}/api/products/${prod2.id}`);
    assert(Number(prod1AfterOrder.data.data.stock_quantity) === initialStock1 - 2, `Product 1 stock decreased by 2 (${initialStock1} -> ${initialStock1 - 2})`);
    assert(Number(prod2AfterOrder.data.data.stock_quantity) === initialStock2 - 1, `Product 2 stock decreased by 1 (${initialStock2} -> ${initialStock2 - 1})`);

    // Verify order in My Orders list
    const myOrdersRes = await apiRequest(`${VITE_URL}/api/orders/my`, 'GET', null, userToken);
    const foundOrder = myOrdersRes.data.data.find(o => o.id === createdOrder.id);
    assert(!!foundOrder && foundOrder.items.length === 2, 'Placed order appears in /api/orders/my with all items');

    // ----------------------------------------------------
    // STEP 9: Cancel Order & Verify Stock Restored
    // ----------------------------------------------------
    console.log('\n[Test 9] Cancel Order & Verify Stock Restored in Marketplace');
    const cancelOrderRes = await apiRequest(
      `${VITE_URL}/api/orders/${createdOrder.id}/cancel`,
      'PUT',
      null,
      userToken
    );
    assert(cancelOrderRes.status === 200 && cancelOrderRes.data.success, `Order #${createdOrder.id} cancelled successfully`);

    // Check stock restored
    const prod1Restored = await apiRequest(`${VITE_URL}/api/products/${prod1.id}`);
    const prod2Restored = await apiRequest(`${VITE_URL}/api/products/${prod2.id}`);
    assert(Number(prod1Restored.data.data.stock_quantity) === initialStock1, `Product 1 stock restored to original (${initialStock1})`);
    assert(Number(prod2Restored.data.data.stock_quantity) === initialStock2, `Product 2 stock restored to original (${initialStock2})`);

    // ----------------------------------------------------
    // STEP 10: Monthly Report API
    // ----------------------------------------------------
    console.log('\n[Test 10] Monthly Waste & Compost Analytics Report');
    const reportRes = await apiRequest(`${VITE_URL}/api/reports/my/monthly?months=6`, 'GET', null, userToken);
    assert(reportRes.data.success && Array.isArray(reportRes.data.data.monthly), 'Monthly report data returned with 6-month slots');
    assert(reportRes.data.data.totals !== undefined, 'Report contains aggregate totals and compost yield estimates');

    // ----------------------------------------------------
    // STEP 11: Submit Support Complaint
    // ----------------------------------------------------
    console.log('\n[Test 11] Submit Grievance Complaint Ticket');
    const complaintRes = await apiRequest(
      `${VITE_URL}/api/feedback`,
      'POST',
      {
        type: 'complaint',
        collection_id: req1Id,
        message: 'The collection vehicle arrived outside the scheduled morning window and missed the gate.'
      },
      userToken
    );
    assert(complaintRes.status === 201 && complaintRes.data.success, 'Complaint ticket submitted successfully');

    const feedbackListRes = await apiRequest(`${VITE_URL}/api/feedback/my`, 'GET', null, userToken);
    const foundComplaint = feedbackListRes.data.data.find(f => f.type === 'complaint');
    assert(!!foundComplaint && (foundComplaint.status === 'open' || foundComplaint.status === 'pending'), 'Submitted grievance ticket appears in /api/feedback/my with status "open"');

    // ----------------------------------------------------
    // STEP 12: Verify Public Marketplace Route & Product Suggest
    // ----------------------------------------------------
    console.log('\n[Test 12] Public Marketplace & Crop Suggestion Endpoint');
    const suggestRes = await apiRequest(`${VITE_URL}/api/products/suggest?use=vegetables`);
    assert(suggestRes.data.success && Array.isArray(suggestRes.data.data), 'GET /api/products/suggest?use=vegetables returns mapped fertilizer products');

    const publicMarketplaceRes = await apiRequest(`${VITE_URL}/marketplace`);
    assert(publicMarketplaceRes.status === 200, 'Public /marketplace route serves status 200 HTML');

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n======================================================');
    console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('======================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runPhase6Tests();
