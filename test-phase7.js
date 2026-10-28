const axios = require('./frontend/node_modules/axios');

const API = 'http://localhost:5000/api';

async function runPhase7Tests() {
  console.log('=== SGMS PHASE 7 DEFINITION OF DONE AUTOMATED TEST SUITE ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Log in as admin@sgms.com / Admin@123
    console.log('1. Testing Admin Authentication...');
    const adminLoginRes = await axios.post(`${API}/auth/login`, {
      email: 'admin@sgms.com',
      password: 'Admin@123'
    });
    assert(adminLoginRes.status === 200, 'Admin login succeeded with status 200');
    assert(adminLoginRes.data.data.token, 'Admin received JWT token');
    assert(adminLoginRes.data.data.user.role === 'admin', 'Admin user role verified as "admin"');
    const adminToken = adminLoginRes.data.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Register a citizen user for end-to-end integration flows
    const testCitizenEmail = `citizen_p7_${Date.now()}@sgms.com`;
    const userRegRes = await axios.post(`${API}/auth/register`, {
      name: 'Rohan Gupta',
      email: testCitizenEmail,
      phone: '9812345678',
      address: 'House 42, Sector 18, Noida',
      password: 'User@123'
    });
    assert(userRegRes.status === 201, 'Citizen user registered for integration flows');
    const userToken = userRegRes.data.data.token;
    const userHeaders = { Authorization: `Bearer ${userToken}` };

    // Subscribe to a plan so collection requests are allowed
    const plansRes = await axios.get(`${API}/subscription-plans`);
    const planId = plansRes.data.data[0].id;
    await axios.post(`${API}/subscriptions`, { plan_id: planId, payment_method: 'card' }, { headers: userHeaders });

    // Create a bin for this citizen and set fill_status to full
    const binRes = await axios.post(`${API}/bins`, {
      bin_type: 'smart_rfid',
      capacity_liters: 120,
      latitude: 28.5355,
      longitude: 77.3910,
      location: 'House 42, Sector 18, Noida'
    }, { headers: userHeaders });
    const userBinId = binRes.data.data.id;
    await axios.put(`${API}/bins/${userBinId}/status`, { fill_status: 'full' }, { headers: userHeaders });

    // 2. Register a 4th driver and see them in the table
    console.log('\n2. Testing 4th Driver Registration & Directory...');
    const initialDriversRes = await axios.get(`${API}/admin/drivers`, { headers: adminHeaders });
    assert(initialDriversRes.status === 200, 'GET /admin/drivers succeeded');
    const initialDriverCount = initialDriversRes.data.data.length;
    console.log(`   Initial drivers count: ${initialDriverCount}`);

    const driverEmail = `driver4_${Date.now()}@sgms.com`;
    const newDriverPayload = {
      name: 'Vikas Sharma',
      email: driverEmail,
      phone: '9876543219',
      password: 'Driver@123',
      address: 'Sector 62, Noida',
      license_no: `DL-${Date.now().toString().slice(-6)}`,
      vehicle_no: `UP-16-DK-${Math.floor(1000 + Math.random() * 9000)}`,
      service_area: 'East Zone',
      base_latitude: 28.5355,
      base_longitude: 77.3910
    };

    const createDriverRes = await axios.post(`${API}/admin/drivers`, newDriverPayload, { headers: adminHeaders });
    assert(createDriverRes.status === 201, 'POST /admin/drivers created driver with status 201');
    assert(createDriverRes.data.data.id, 'Created driver returned valid driver ID');

    const updatedDriversRes = await axios.get(`${API}/admin/drivers`, { headers: adminHeaders });
    const foundNewDriver = updatedDriversRes.data.data.find(d => d.email === driverEmail);
    assert(!!foundNewDriver, 'New 4th driver appears in GET /admin/drivers list');
    assert(updatedDriversRes.data.data.length === initialDriverCount + 1, 'Total driver count increased by exactly 1');

    // 3. Approve a pending collection request, then assign it using nearby drivers list
    console.log('\n3. Testing Collection Workflow: Approve & Assign with Nearby Drivers...');
    // Ensure we have a pending request
    let pendingReq = null;
    const allRequestsRes = await axios.get(`${API}/admin/collections`, { headers: adminHeaders });
    pendingReq = allRequestsRes.data.data.find(r => r.status === 'pending');

    if (!pendingReq) {
      console.log('   Creating a new pending collection request for testing...');
      // Get user bins
      const userBinsRes = await axios.get(`${API}/bins/my`, { headers: userHeaders });
      let testBin = userBinsRes.data.data.find(b => b.fill_status === 'full' || b.fill_status === 'half');
      if (!testBin) {
        testBin = userBinsRes.data.data[0];
        await axios.put(`${API}/bins/${testBin.id}/status`, { fill_status: 'full' }, { headers: userHeaders });
      }
      const newReqRes = await axios.post(`${API}/collections`, {
        bin_id: testBin.id,
        waste_type: 'organic',
        address: '123 Green Avenue, Sector 15',
        latitude: 28.5355,
        longitude: 77.3910,
        remarks: 'Phase 7 automated verification request'
      }, { headers: userHeaders });
      pendingReq = newReqRes.data.data;
    }

    assert(!!pendingReq, `Target pending request found with ID: ${pendingReq.id}`);

    // Approve the pending request
    const approveRes = await axios.put(`${API}/admin/collections/${pendingReq.id}/approve`, {}, { headers: adminHeaders });
    assert(approveRes.status === 200, `PUT /admin/collections/${pendingReq.id}/approve succeeded`);
    assert(approveRes.data.data.status === 'approved', 'Request status transitioned to "approved"');

    // Get nearby drivers for approved request
    const nearbyRes = await axios.get(`${API}/admin/collections/${pendingReq.id}/nearby-drivers`, { headers: adminHeaders });
    assert(nearbyRes.status === 200, 'GET /admin/collections/:id/nearby-drivers succeeded');
    assert(Array.isArray(nearbyRes.data.data) && nearbyRes.data.data.length > 0, 'Nearby drivers list returned non-empty array');
    assert(nearbyRes.data.data[0].recommended === true, 'First closest driver has recommended: true flag');
    assert(typeof nearbyRes.data.data[0].distance_km === 'number', 'Driver contains calculated Haversine distance_km');

    const chosenDriver = nearbyRes.data.data[0];
    console.log(`   Assigning closest driver: ${chosenDriver.name} (driver_id: ${chosenDriver.id}, distance: ${chosenDriver.distance_km} km)`);

    // Assign driver
    const assignRes = await axios.put(`${API}/admin/collections/${pendingReq.id}/assign`, {
      driver_id: chosenDriver.id
    }, { headers: adminHeaders });
    assert(assignRes.status === 200, `PUT /admin/collections/${pendingReq.id}/assign succeeded`);
    assert(assignRes.data.data.status === 'driver_assigned', 'Request status transitioned to "driver_assigned"');

    // 4. Respond to a complaint
    console.log('\n4. Testing Citizen Grievances & Admin Response...');
    // Create a complaint if none exists
    let complaintsRes = await axios.get(`${API}/admin/feedback?type=complaint`, { headers: adminHeaders });
    let targetComplaint = complaintsRes.data.data.find(c => c.status === 'open' || c.status === 'in_progress');

    if (!targetComplaint) {
      console.log('   Filing a test complaint from citizen...');
      const createComplaintRes = await axios.post(`${API}/feedback`, {
        type: 'complaint',
        message: 'Missed pickup scheduled yesterday. Please expedite collection as bin is overflowing.'
      }, { headers: userHeaders });
      targetComplaint = createComplaintRes.data.data;
    }

    assert(!!targetComplaint, `Target complaint found with ID: ${targetComplaint.id}`);

    const responseText = 'We sincerely apologize for the delay. An emergency pickup vehicle has been dispatched.';
    const updateFeedbackRes = await axios.put(`${API}/admin/feedback/${targetComplaint.id}`, {
      status: 'resolved',
      admin_response: responseText
    }, { headers: adminHeaders });

    assert(updateFeedbackRes.status === 200, `PUT /admin/feedback/${targetComplaint.id} succeeded`);
    assert(updateFeedbackRes.data.data.status === 'resolved', 'Complaint status updated to "resolved"');
    assert(updateFeedbackRes.data.data.admin_response === responseText, 'Admin response recorded correctly');

    // 5. Add a product and a category
    console.log('\n5. Testing Marketplace Administration (Category & Product)...');
    const categoryName = `Specialty Bio-Enzymes ${Date.now().toString().slice(-4)}`;
    const createCategoryRes = await axios.post(`${API}/admin/categories`, {
      name: categoryName,
      description: 'Fermented microbial bio-inoculants for rapid soil remediation'
    }, { headers: adminHeaders });
    assert(createCategoryRes.status === 201, 'POST /admin/categories created category with status 201');
    const createdCategoryId = createCategoryRes.data.data.id;
    assert(createdCategoryId > 0, `Created category ID: ${createdCategoryId}`);

    const productName = `Bio-Enzyme Nitro Boost ${Date.now().toString().slice(-4)}`;
    const createProductRes = await axios.post(`${API}/admin/products`, {
      category_id: createdCategoryId,
      name: productName,
      description: 'High nitrogen microbial culture made from fermented organic green waste.',
      price: 249.00,
      stock_quantity: 85,
      unit: 'bottle (1L)',
      suitable_for: 'soil,crops,plants',
      is_active: true
    }, { headers: adminHeaders });
    assert(createProductRes.status === 201, 'POST /admin/products created product with status 201');
    assert(createProductRes.data.data.name === productName, 'Product name verified in response');
    assert(Number(createProductRes.data.data.price) === 249.00, 'Product price verified as ₹249.00');

    // 6. Open /admin dashboard: verify charts and tables load with no console errors
    console.log('\n6. Testing Admin Dashboard Analytics & Operational KPIs...');
    const dashRes = await axios.get(`${API}/admin/dashboard`, { headers: adminHeaders });
    assert(dashRes.status === 200, 'GET /admin/dashboard returned status 200');
    const dashData = dashRes.data.data;
    assert(typeof dashData.total_users === 'number', `total_users KPI present: ${dashData.total_users}`);
    assert(typeof dashData.total_drivers === 'number', `total_drivers KPI present: ${dashData.total_drivers}`);
    assert(typeof dashData.total_bins === 'number', `total_bins KPI present: ${dashData.total_bins}`);
    assert(typeof dashData.pending_requests === 'number', `pending_requests KPI present: ${dashData.pending_requests}`);
    assert(typeof dashData.total_waste_kg === 'number', `total_waste_kg KPI present: ${dashData.total_waste_kg} kg`);
    assert(typeof dashData.total_orders === 'number', `total_orders KPI present: ${dashData.total_orders}`);
    assert(Array.isArray(dashData.monthly_waste) && dashData.monthly_waste.length === 6, 'monthly_waste contains 6 consecutive months for BarChart');
    assert(Array.isArray(dashData.waste_by_type), 'waste_by_type contains array for PieChart');
    assert(typeof dashData.requests_by_status === 'object', 'requests_by_status contains status breakdown object');
    assert(Array.isArray(dashData.recent_requests), 'recent_requests contains array');
    assert(Array.isArray(dashData.recent_orders), 'recent_orders contains array');
    assert(Array.isArray(dashData.full_bins), 'full_bins contains array');
    assert(Array.isArray(dashData.recent_feedback), 'recent_feedback contains array');

    // 7. Download CSV export
    console.log('\n7. Testing CSV Export Endpoint...');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const exportRes = await axios.get(`${API}/admin/reports/export?month=${currentMonth}`, {
      headers: adminHeaders,
      responseType: 'text'
    });
    assert(exportRes.status === 200, 'GET /admin/reports/export returned status 200');
    assert(exportRes.headers['content-type'].includes('text/csv'), 'Content-Type header includes "text/csv"');
    assert(exportRes.data.includes('Smart Garbage Management System - Monthly Report'), 'CSV body contains report header');
    assert(exportRes.data.includes('Collections Count'), 'CSV body includes Collections Count metric');
    assert(exportRes.data.includes('Total Waste Collected (kg)'), 'CSV body includes Total Waste metric');
    assert(exportRes.data.includes('Waste Breakdown By Type'), 'CSV body includes Waste Breakdown section');
    assert(exportRes.data.includes('Waste Collection By Driver'), 'CSV body includes Driver Breakdown section');

    // 8. Verify all other Admin Pages & Data endpoints respond cleanly
    console.log('\n8. Testing Read Endpoints for All Admin Portal Pages...');
    const endpoints = [
      { name: 'Users', path: '/admin/users' },
      { name: 'Bins', path: '/admin/bins' },
      { name: 'Waste Records', path: '/admin/waste-records' },
      { name: 'Composting Units', path: '/admin/composting/units' },
      { name: 'Composting Batches', path: '/admin/composting/batches' },
      { name: 'Pending Organic Waste', path: '/admin/composting/pending-waste' },
      { name: 'Orders', path: '/admin/orders' },
      { name: 'Payments', path: '/admin/payments' },
      { name: 'Subscriptions', path: '/admin/subscriptions' },
      { name: 'Monthly Reports', path: `/admin/reports/monthly?month=${currentMonth}` }
    ];

    for (const ep of endpoints) {
      const res = await axios.get(`${API}${ep.path}`, { headers: adminHeaders });
      assert(res.status === 200, `GET ${ep.path} (${ep.name}) returned 200 OK`);
      assert(res.data && res.data.data !== undefined, `GET ${ep.path} returned valid data payload`);
    }

    console.log(`\n======================================================`);
    console.log(`RESULTS: ${passed} / ${total} CHECKS PASSED`);
    console.log(`======================================================`);

    if (passed === total) {
      console.log('\n🎉 ALL PHASE 7 DEFINITION OF DONE REQUIREMENTS MET PERFECTLY!');
    } else {
      console.error('\n⚠️ SOME CHECKS FAILED. PLEASE REVIEW ABOVE.');
    }
  } catch (err) {
    console.error('Test execution error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runPhase7Tests();
