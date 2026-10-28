const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function seed() {
  console.log('--- Starting Database Seeding ---');

  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    multipleStatements: true
  };

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('Connected to MySQL server successfully.');

    // 1. Run schema.sql
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    console.log(`Reading schema from ${schemaPath}...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');
    await connection.query(schemaSql);
    console.log('Database sgms_db created and schema initialized successfully.');

    // Switch to sgms_db
    await connection.changeUser({ database: process.env.DB_NAME || 'sgms_db' });

    // 2. Insert roles
    console.log('Seeding roles...');
    const roles = [
      ['admin', 'System Administrator with full access'],
      ['driver', 'Waste collection vehicle driver'],
      ['user', 'Standard registered public user']
    ];
    for (const [name, description] of roles) {
      await connection.query(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        [name, description]
      );
    }
    const [roleRows] = await connection.query('SELECT id, name FROM roles');
    const roleMap = {};
    roleRows.forEach(r => { roleMap[r.name] = r.id; });

    // 3. Insert Admin user
    console.log('Seeding admin user...');
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    await connection.query(
      `INSERT INTO users (role_id, name, email, phone, password_hash, address, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        roleMap['admin'],
        'System Admin',
        'admin@sgms.com',
        '9876543210',
        adminPasswordHash,
        'SGMS Headquarters, Chengannur',
        true
      ]
    );

    // 4. Insert 3 Drivers
    console.log('Seeding 3 drivers...');
    const driverPasswordHash = await bcrypt.hash('Driver@123', 10);
    const driversData = [
      {
        name: 'Rajesh Kumar',
        email: 'driver1@sgms.com',
        phone: '9447001001',
        license_no: 'KL-DL-1001',
        vehicle_no: 'KL-30-A-1111',
        base_latitude: 9.3159,
        base_longitude: 76.6151,
        service_area: 'Chengannur'
      },
      {
        name: 'Anil Thomas',
        email: 'driver2@sgms.com',
        phone: '9447001002',
        license_no: 'KL-DL-1002',
        vehicle_no: 'KL-30-B-2222',
        base_latitude: 9.2585,
        base_longitude: 76.5417,
        service_area: 'Mavelikkara'
      },
      {
        name: 'Sibin Varghese',
        email: 'driver3@sgms.com',
        phone: '9447001003',
        license_no: 'KL-DL-1003',
        vehicle_no: 'KL-30-C-3333',
        base_latitude: 9.3840,
        base_longitude: 76.5741,
        service_area: 'Thiruvalla'
      }
    ];

    for (const d of driversData) {
      const [userResult] = await connection.query(
        `INSERT INTO users (role_id, name, email, phone, password_hash, address, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          roleMap['driver'],
          d.name,
          d.email,
          d.phone,
          driverPasswordHash,
          `${d.service_area}, Kerala`,
          true
        ]
      );
      const userId = userResult.insertId;

      await connection.query(
        `INSERT INTO drivers (user_id, license_no, vehicle_no, base_latitude, base_longitude, service_area, is_available, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          d.license_no,
          d.vehicle_no,
          d.base_latitude,
          d.base_longitude,
          d.service_area,
          true,
          true
        ]
      );
    }

    // 5. Insert 2 Subscription Plans
    console.log('Seeding subscription plans...');
    const subscriptionPlans = [
      ['Monthly Plan', 'monthly', 299.00, 30, 'Standard monthly waste collection plan for households', true],
      ['Yearly Plan', 'yearly', 2999.00, 365, 'Discounted yearly waste collection plan for households', true]
    ];
    for (const plan of subscriptionPlans) {
      await connection.query(
        `INSERT INTO subscription_plans (name, plan_type, price, duration_days, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        plan
      );
    }
    const [subscriptionPlanRows] = await connection.query(
      'SELECT id, name, price FROM subscription_plans'
    );
    const subscriptionPlanMap = {};
    subscriptionPlanRows.forEach(plan => {
      subscriptionPlanMap[plan.name] = plan;
    });

    // 6. Insert demo users with subscriptions at each expiry reminder milestone
    console.log('Seeding demo users with expiring subscriptions...');
    const demoUserPassword = 'User@123';
    const demoUserPasswordHash = await bcrypt.hash(demoUserPassword, 10);
    const demoUsers = [
      { name: 'Expiry Demo Seven Days', email: 'expiry7@sgms.com', phone: '9000000007', daysUntilEnd: 7 },
      { name: 'Expiry Demo Five Days', email: 'expiry5@sgms.com', phone: '9000000005', daysUntilEnd: 5 },
      { name: 'Expiry Demo Three Days', email: 'expiry3@sgms.com', phone: '9000000003', daysUntilEnd: 3 },
      { name: 'Expiry Demo Tomorrow', email: 'expiry1@sgms.com', phone: '9000000001', daysUntilEnd: 1 },
      { name: 'Expiry Demo Ends Today', email: 'expiry0@sgms.com', phone: '9000000000', daysUntilEnd: 0 },
      { name: 'Expiry Demo Expired Yesterday', email: 'expired@sgms.com', phone: '9000000009', daysUntilEnd: -1 },
      { name: 'Expiry Demo Expired 3 Days Ago', email: 'expired3@sgms.com', phone: '9000000008', daysUntilEnd: -3 }
    ];
    const monthlyPlan = subscriptionPlanMap['Monthly Plan'];

    for (const demoUser of demoUsers) {
      const [userResult] = await connection.query(
        `INSERT INTO users (role_id, name, email, phone, password_hash, address, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          roleMap['user'],
          demoUser.name,
          demoUser.email,
          demoUser.phone,
          demoUserPasswordHash,
          'SGMS Demo Address, Chengannur',
          true
        ]
      );

      await connection.query(
        `INSERT INTO subscriptions
          (user_id, plan_id, start_date, end_date, status, amount)
         VALUES (?, ?, DATE_SUB(CURDATE(), INTERVAL 23 DAY),
                 DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, ?)`,
        [
          userResult.insertId,
          monthlyPlan.id,
          demoUser.daysUntilEnd,
          demoUser.daysUntilEnd < 0 ? 'expired' : 'active',
          monthlyPlan.price
        ]
      );
    }

    // 7. Insert 5 Product Categories
    console.log('Seeding product categories...');
    const categories = [
      ['Plant Fertilizer', 'Fertilizers designed for general plant growth and greenery'],
      ['Vegetable Fertilizer', 'High-nutrition organic fertilizer formulated for vegetable farming'],
      ['Flower Fertilizer', 'Phosphorus-rich fertilizers promoting healthy, vibrant blooms'],
      ['Soil Conditioner', 'Formulations that improve soil structure, microbial activity, and aeration'],
      ['Organic Compost', 'Natural compost produced from collected and processed municipal organic waste']
    ];
    const categoryMap = {};
    for (const [name, description] of categories) {
      const [catResult] = await connection.query(
        'INSERT INTO product_categories (name, description, is_active) VALUES (?, ?, ?)',
        [name, description, true]
      );
      categoryMap[name] = catResult.insertId;
    }

    // 8. Insert 8 Products
    console.log('Seeding 8 products...');
    const productsData = [
      {
        category: 'Plant Fertilizer',
        name: 'Bio-Grow Plant Booster',
        description: 'All-purpose balanced liquid organic booster for indoor and patio greenery.',
        suitable_for: 'Indoor potted plants, herbs, and decorative shrubs',
        price: 150.00,
        unit: 'kg',
        stock_quantity: 120,
        image_url: ''
      },
      {
        category: 'Plant Fertilizer',
        name: 'GreenLeaf Foliar Nutrient',
        description: 'Micronutrient enriched blend for healthy leaf pigmentation and vigor.',
        suitable_for: 'Bonsai, foliage, and garden greens',
        price: 180.00,
        unit: 'kg',
        stock_quantity: 80,
        image_url: ''
      },
      {
        category: 'Vegetable Fertilizer',
        name: 'HarvestMax Veggie Booster',
        description: 'Enhanced organic blend providing high nitrogen and potassium for vegetable crops.',
        suitable_for: 'Tomatoes, chillies, beans, and gourds',
        price: 220.00,
        unit: 'kg',
        stock_quantity: 150,
        image_url: ''
      },
      {
        category: 'Vegetable Fertilizer',
        name: 'Kitchen Garden Granules',
        description: 'Slow-release organic bio-granules for backyard raised beds and grow bags.',
        suitable_for: 'Leafy greens, spinach, carrots, and radishes',
        price: 195.00,
        unit: 'kg',
        stock_quantity: 90,
        image_url: ''
      },
      {
        category: 'Flower Fertilizer',
        name: 'BloomMaster Floral Special',
        description: 'Phosphorus and potassium organic formulation to stimulate continuous blooming.',
        suitable_for: 'Roses, marigolds, hibiscus, and jasmine',
        price: 250.00,
        unit: 'kg',
        stock_quantity: 65,
        image_url: ''
      },
      {
        category: 'Soil Conditioner',
        name: 'NutriSoil Organic Soil Conditioner',
        description: 'Improves soil aeration, microbial ecosystem, and moisture retention.',
        suitable_for: 'tapioca and other crops',
        price: 160.00,
        unit: 'kg',
        stock_quantity: 140,
        image_url: ''
      },
      {
        category: 'Soil Conditioner',
        name: 'Bio-Humus Soil Rejuvenator',
        description: 'Humic and fulvic acid enriched conditioner to revitalize depleted soils.',
        suitable_for: 'tapioca and other crops',
        price: 320.00,
        unit: 'kg',
        stock_quantity: 50,
        image_url: ''
      },
      {
        category: 'Organic Compost',
        name: 'Chengannur Pure Organic Compost',
        description: '100% aerobic municipal compost processed from segregated organic household waste.',
        suitable_for: 'All home gardens, plantations, and field agriculture',
        price: 130.00,
        unit: 'kg',
        stock_quantity: 200,
        image_url: ''
      }
    ];

    for (const p of productsData) {
      await connection.query(
        `INSERT INTO products (category_id, name, description, suitable_for, price, unit, stock_quantity, image_url, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          categoryMap[p.category],
          p.name,
          p.description,
          p.suitable_for,
          p.price,
          p.unit,
          p.stock_quantity,
          p.image_url,
          true
        ]
      );
    }

    // 9. Insert 1 Composting Unit
    console.log('Seeding composting unit...');
    await connection.query(
      `INSERT INTO composting_units (name, location, is_active)
       VALUES (?, ?, ?)`,
      ['Chengannur Composting Unit', 'Chengannur Central Waste Management Facility, Alappuzha', true]
    );

    console.log('\n==========================================');
    console.log('DATABASE SEEDED SUCCESSFULLY!');
    console.log('==========================================\n');
    console.log('--- SEEDED LOGIN CREDENTIALS ---');
    console.log('1. Admin:');
    console.log('   Email:    admin@sgms.com');
    console.log('   Password: Admin@123\n');
    console.log('2. Driver 1:');
    console.log('   Email:    driver1@sgms.com');
    console.log('   Password: Driver@123\n');
    console.log('3. Driver 2:');
    console.log('   Email:    driver2@sgms.com');
    console.log('   Password: Driver@123\n');
    console.log('4. Driver 3:');
    console.log('   Email:    driver3@sgms.com');
    console.log('   Password: Driver@123\n');
    console.log('5. Expiry reminder demo users (email is the username):');
    demoUsers.forEach((demoUser) => {
      console.log(`   ${demoUser.email} / ${demoUserPassword} (${demoUser.daysUntilEnd} days until end)`);
    });
    console.log('==========================================');

  } catch (err) {
    console.error('Seeding failed with error:', err);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seed();
