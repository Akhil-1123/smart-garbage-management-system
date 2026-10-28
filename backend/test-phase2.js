const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

async function runTests() {
  const results = [];

  function record(testCase, passed, details) {
    results.push({ testCase, status: passed ? 'PASSED' : 'FAILED', details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testCase}: ${details}`);
  }

  try {
    console.log(`Starting Phase 2 verification against ${BASE_URL}...\n`);

    // 0. Health check
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    if (healthRes.status === 200 && healthData.status === 'ok') {
      console.log('Health check confirmed: OK\n');
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }

    // 1. Register a user
    const userPayload = {
      name: 'Anu Jacob',
      email: 'anu.jacob@example.com',
      phone: '9847123456',
      password: 'User@1234',
      address: 'Kallissery, Chengannur'
    };

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });
    const regData = await regRes.json();
    const userToken = regData.data ? regData.data.token : null;
    const user1 = regData.data ? regData.data.user : null;

    if (regRes.status === 201 && regData.success && userToken && user1.role === 'user') {
      record('1. Register a user', true, `User registered with ID ${user1.id}, token received`);
    } else {
      record('1. Register a user', false, `Status: ${regRes.status}, Message: ${regData.message}`);
    }

    // 2. Duplicate email gives 409
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });
    const dupData = await dupRes.json();
    if (dupRes.status === 409 && !dupData.success) {
      record('2. Duplicate email gives 409', true, `Correctly returned 409: "${dupData.message}"`);
    } else {
      record('2. Duplicate email gives 409', false, `Status: ${dupRes.status}, Response: ${JSON.stringify(dupData)}`);
    }

    // 3. Login as user, admin and driver1
    // User login
    const userLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'anu.jacob@example.com', password: 'User@1234' })
    });
    const userLoginData = await userLoginRes.json();
    const uLoginOk = userLoginRes.status === 200 && userLoginData.data.user.role === 'user';

    // Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sgms.com', password: 'Admin@123' })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.data ? adminLoginData.data.token : null;
    const aLoginOk = adminLoginRes.status === 200 && adminLoginData.data.user.role === 'admin';

    // Driver 1 login
    const driverLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver1@sgms.com', password: 'Driver@123' })
    });
    const driverLoginData = await driverLoginRes.json();
    const dLoginOk = driverLoginRes.status === 200 && driverLoginData.data.user.role === 'driver' && driverLoginData.data.user.driver_id;

    if (uLoginOk && aLoginOk && dLoginOk) {
      record('3. Login as the user, admin and driver1', true, `All 3 logins returned tokens and verified roles (driver included driver_id ${driverLoginData.data.user.driver_id})`);
    } else {
      record('3. Login as the user, admin and driver1', false, `uLogin: ${uLoginOk}, aLogin: ${aLoginOk}, dLogin: ${dLoginOk}`);
    }

    // 4. Admin creates a 4th driver
    const driver4Payload = {
      name: 'Mathew Philip',
      email: 'driver4@sgms.com',
      phone: '9447001004',
      password: 'Driver@123',
      address: 'Pandanad, Chengannur',
      license_no: 'KL-DL-1004',
      vehicle_no: 'KL-30-D-4444',
      base_latitude: 9.3320,
      base_longitude: 76.5920,
      service_area: 'Pandanad'
    };

    const createD4Res = await fetch(`${BASE_URL}/api/admin/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(driver4Payload)
    });
    const createD4Data = await createD4Res.json();
    const d4DriverId = createD4Data.data ? createD4Data.data.id : null;

    if (createD4Res.status === 201 && createD4Data.success && d4DriverId) {
      record('4. Admin creates a 4th driver', true, `4th driver created with ID ${d4DriverId}`);
    } else {
      record('4. Admin creates a 4th driver', false, `Status: ${createD4Res.status}, Response: ${JSON.stringify(createD4Data)}`);
    }

    // 5. Deactivated driver cannot log in
    // Deactivate driver 4
    const deactRes = await fetch(`${BASE_URL}/api/admin/drivers/${d4DriverId}/toggle-active`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deactData = await deactRes.json();

    // Try login as driver 4
    const d4LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver4@sgms.com', password: 'Driver@123' })
    });
    const d4LoginData = await d4LoginRes.json();

    if (d4LoginRes.status === 403 && !d4LoginData.success) {
      record('5. Deactivated driver cannot log in', true, `Correctly rejected with 403: "${d4LoginData.message}"`);
    } else {
      record('5. Deactivated driver cannot log in', false, `Status: ${d4LoginRes.status}, Response: ${JSON.stringify(d4LoginData)}`);
    }

    // Reactivate driver 4
    await fetch(`${BASE_URL}/api/admin/drivers/${d4DriverId}/toggle-active`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    // 6. User subscribes to the Monthly Plan
    // Get plans first
    const plansRes = await fetch(`${BASE_URL}/api/subscription-plans`);
    const plansData = await plansRes.json();
    const monthlyPlan = plansData.data.find(p => p.plan_type === 'monthly');

    const subRes = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ plan_id: monthlyPlan.id, payment_method: 'upi' })
    });
    const subData = await subRes.json();

    if (subRes.status === 201 && subData.success && subData.data.subscription && subData.data.payment) {
      record(
        '6. User subscribes to the Monthly Plan',
        true,
        `Subscription created (ID ${subData.data.subscription.id}) with mock payment (Txn: ${subData.data.payment.transaction_id})`
      );
    } else {
      record('6. User subscribes to the Monthly Plan', false, `Status: ${subRes.status}, Response: ${JSON.stringify(subData)}`);
    }

    // 7. Second subscribe gives 400
    const sub2Res = await fetch(`${BASE_URL}/api/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ plan_id: monthlyPlan.id, payment_method: 'card' })
    });
    const sub2Data = await sub2Res.json();

    if (sub2Res.status === 400 && !sub2Data.success) {
      record('7. A second subscribe gives 400', true, `Correctly blocked with 400: "${sub2Data.message}"`);
    } else {
      record('7. A second subscribe gives 400', false, `Status: ${sub2Res.status}, Response: ${JSON.stringify(sub2Data)}`);
    }

    // 8. User creates a bin and sets its status half, then full
    const binPayload = {
      location: 'Kallissery East Gate, Chengannur',
      latitude: 9.3201,
      longitude: 76.6210,
      bin_type: 'organic',
      capacity_kg: 25.0
    };

    const binRes = await fetch(`${BASE_URL}/api/bins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(binPayload)
    });
    const binData = await binRes.json();
    const createdBinId = binData.data ? binData.data.id : null;

    // Set status to half
    const halfRes = await fetch(`${BASE_URL}/api/bins/${createdBinId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ fill_status: 'half' })
    });
    const halfData = await halfRes.json();
    const halfOk = halfRes.status === 200 && Number(halfData.data.bin.current_level) === 50;

    // Set status to full
    const fullRes = await fetch(`${BASE_URL}/api/bins/${createdBinId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({ fill_status: 'full' })
    });
    const fullData = await fullRes.json();
    const fullOk = fullRes.status === 200 && Number(fullData.data.bin.current_level) === 100;

    if (binRes.status === 201 && halfOk && fullOk) {
      record(
        '8. User creates a bin and sets status half, then full',
        true,
        `Bin ID ${createdBinId} created (level 0), updated to half (level 50), then full (level 100)`
      );
    } else {
      record('8. User creates a bin and sets status half, then full', false, `binRes: ${binRes.status}, halfOk: ${halfOk}, fullOk: ${fullOk}`);
    }

    // 9. History shows 3 rows
    const histRes = await fetch(`${BASE_URL}/api/bins/${createdBinId}/history`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const histData = await histRes.json();
    const rows = histData.data || [];

    if (histRes.status === 200 && rows.length === 3) {
      const statuses = rows.map(r => `${r.status}(${Number(r.level)}%)`).join(' -> ');
      record('9. History shows 3 rows', true, `Exactly 3 history rows recorded: [${statuses}]`);
    } else {
      record('9. History shows 3 rows', false, `Found ${rows.length} rows instead of 3. Data: ${JSON.stringify(rows)}`);
    }

    console.log('\n======================================================');
    console.log('PHASE 2 VERIFICATION SUMMARY TABLE');
    console.log('======================================================');
    console.table(results);

    const hasFailed = results.some(r => r.status === 'FAILED');
    if (hasFailed) {
      console.error('\nOne or more checks failed!');
      process.exit(1);
    } else {
      console.log('\nALL 9 CHECKS PASSED PERFECTLY!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
