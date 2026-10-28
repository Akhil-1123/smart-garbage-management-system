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

async function runPhase5Tests() {
  console.log('\n======================================================');
  console.log('   STARTING PHASE 5 DEFINITION OF DONE VERIFICATION   ');
  console.log('======================================================\n');

  try {
    // ----------------------------------------------------
    // STEP 1: Verify Vite Dev Server & Proxy Routing
    // ----------------------------------------------------
    console.log('[Test 1] Vite Dev Server & API Reverse Proxy');
    const viteHome = await apiRequest(VITE_URL);
    assert(viteHome.status === 200 && viteHome.data.includes('<div id="root">'), 'Vite serves index.html at http://localhost:5173');

    const viteProxyHealth = await apiRequest(`${VITE_URL}/api/health`);
    assert(viteProxyHealth.status === 200 && viteProxyHealth.data.status === 'ok', 'Vite proxies /api/health -> http://localhost:5000/api/health');

    const viteProxyProducts = await apiRequest(`${VITE_URL}/api/products`);
    assert(viteProxyProducts.data.success === true && Array.isArray(viteProxyProducts.data.data), 'Vite proxies public /api/products correctly');

    // ----------------------------------------------------
    // STEP 2: Register a New User
    // ----------------------------------------------------
    console.log('\n[Test 2] Citizen Registration (/api/auth/register)');
    const testUserEmail = `citizen_${Date.now()}@example.com`;
    const regRes = await apiRequest(`${VITE_URL}/api/auth/register`, 'POST', {
      name: 'Suresh Kumar',
      email: testUserEmail,
      phone: '9876543210',
      address: 'House 42, Green Valley, Chengannur',
      password: 'Password@123'
    });
    assert(regRes.status === 201 && regRes.data.success === true, 'User registered successfully');
    assert(regRes.data.data.user.role === 'user', 'New registered account is assigned role "user"');
    const userToken = regRes.data.data.token;
    assert(!!userToken, 'JWT auth token returned upon registration');

    // ----------------------------------------------------
    // STEP 3: User Login
    // ----------------------------------------------------
    console.log('\n[Test 3] Citizen Login (/api/auth/login)');
    const loginRes = await apiRequest(`${VITE_URL}/api/auth/login`, 'POST', {
      email: testUserEmail,
      password: 'Password@123'
    });
    assert(loginRes.status === 200 && loginRes.data.data.token, 'User logged in successfully with email and password');

    // ----------------------------------------------------
    // STEP 4: Protected Admin Route Access Denied for User
    // ----------------------------------------------------
    console.log('\n[Test 4] Protected Route Check (User cannot access /api/admin/*)');
    const adminForbiddenRes = await apiRequest(`${VITE_URL}/api/admin/users`, 'GET', null, userToken);
    assert(adminForbiddenRes.status === 403, 'User access to /api/admin/users correctly rejected with 403 Forbidden');

    // ----------------------------------------------------
    // STEP 5: Subscribe to a Plan with Mock Payment
    // ----------------------------------------------------
    console.log('\n[Test 5] Subscription Purchase Flow (/api/subscriptions)');
    const plansRes = await apiRequest(`${VITE_URL}/api/subscription-plans`);
    assert(plansRes.data.success && plansRes.data.data.length > 0, 'Active subscription plans listed');
    const chosenPlan = plansRes.data.data[0];

    const subRes = await apiRequest(
      `${VITE_URL}/api/subscriptions`,
      'POST',
      { plan_id: chosenPlan.id, payment_method: 'upi' },
      userToken
    );
    assert(subRes.status === 201 && subRes.data.data.subscription?.status === 'active', `Subscribed to ${chosenPlan.name} with mock payment`);
    assert(subRes.data.data.payment?.transaction_id?.startsWith('TXN'), 'Transaction ID format "TXN..." verified');

    const mySubsRes = await apiRequest(`${VITE_URL}/api/subscriptions/my`, 'GET', null, userToken);
    assert(mySubsRes.data.data.length > 0 && mySubsRes.data.data[0].status === 'active', 'User subscriptions list shows active plan');

    // ----------------------------------------------------
    // STEP 6: Add a Smart Bin with Map Coordinates
    // ----------------------------------------------------
    console.log('\n[Test 6] Add Smart Bin with Map GPS Location (/api/bins)');
    const addBinRes = await apiRequest(
      `${VITE_URL}/api/bins`,
      'POST',
      {
        location: 'Front Garden Gate',
        bin_type: 'organic',
        capacity_kg: 25,
        latitude: 9.3159,
        longitude: 76.6151
      },
      userToken
    );
    assert(addBinRes.status === 201 && addBinRes.data.success, 'Smart bin added successfully with GPS coordinates');
    const createdBin = addBinRes.data.data;
    assert(createdBin.fill_status === 'empty' && Number(createdBin.current_level) === 0, 'Initial bin fill_status is "empty" (0%)');

    // ----------------------------------------------------
    // STEP 7: Switch Status: Empty -> Half -> Full
    // ----------------------------------------------------
    console.log('\n[Test 7] Segmented Control Status Updates (Empty -> Half -> Full)');
    const halfRes = await apiRequest(
      `${VITE_URL}/api/bins/${createdBin.id}/status`,
      'PUT',
      { fill_status: 'half' },
      userToken
    );
    const updatedHalfBin = halfRes.data.data.bin || halfRes.data.data;
    assert(updatedHalfBin.fill_status === 'half' && Number(updatedHalfBin.current_level) === 50, 'Bin status switched to "half" (50% capacity)');

    const fullRes = await apiRequest(
      `${VITE_URL}/api/bins/${createdBin.id}/status`,
      'PUT',
      { fill_status: 'full' },
      userToken
    );
    const updatedFullBin = fullRes.data.data.bin || fullRes.data.data;
    assert(updatedFullBin.fill_status === 'full' && Number(updatedFullBin.current_level) === 100, 'Bin status switched to "full" (100% capacity)');

    // ----------------------------------------------------
    // STEP 8: Bin Status History Audit Log
    // ----------------------------------------------------
    console.log('\n[Test 8] Bin Status History Modal Audit Log (/api/bins/:id/history)');
    const historyRes = await apiRequest(`${VITE_URL}/api/bins/${createdBin.id}/history`, 'GET', null, userToken);
    assert(historyRes.data.success && historyRes.data.data.length >= 2, 'History audit records returned');
    const latestChange = historyRes.data.data[0];
    assert(latestChange.status?.toLowerCase() === 'full', 'Latest history record correctly captures "full" transition');

    // ----------------------------------------------------
    // STEP 9: Profile Update
    // ----------------------------------------------------
    console.log('\n[Test 9] Profile Update Form (/api/auth/profile)');
    const updateProfileRes = await apiRequest(
      `${VITE_URL}/api/auth/profile`,
      'PUT',
      {
        name: 'Suresh K. Nair',
        phone: '9876543211',
        address: 'Villa 42, Green Valley Phase 2, Chengannur'
      },
      userToken
    );
    assert(updateProfileRes.status === 200 && updateProfileRes.data.data.name === 'Suresh K. Nair', 'Profile name, phone, and address updated');

    const meRes = await apiRequest(`${VITE_URL}/api/auth/me`, 'GET', null, userToken);
    assert(meRes.data.data.name === 'Suresh K. Nair' && meRes.data.data.phone === '9876543211', 'GET /api/auth/me confirms updated profile details');

    // ----------------------------------------------------
    // STEP 10: Admin Login & Protected Route Access
    // ----------------------------------------------------
    console.log('\n[Test 10] Admin Login & Role Protection (/admin)');
    const adminLoginRes = await apiRequest(`${VITE_URL}/api/auth/login`, 'POST', {
      email: 'admin@sgms.com',
      password: 'Admin@123'
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.data.data.user.role === 'admin', 'Admin logged in successfully');
    const adminToken = adminLoginRes.data.data.token;

    const adminUsersRes = await apiRequest(`${VITE_URL}/api/admin/users`, 'GET', null, adminToken);
    assert(adminUsersRes.status === 200 && Array.isArray(adminUsersRes.data.data), 'Admin successfully accesses protected /api/admin/users');

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n======================================================');
    console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('======================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runPhase5Tests();
