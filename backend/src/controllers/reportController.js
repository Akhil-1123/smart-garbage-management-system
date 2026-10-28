const db = require('../config/db');
const { ok, fail } = require('../utils/response');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getLastNMonths(n = 6) {
  const list = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const month = `${y}-${m}`;
    const label = `${MONTH_NAMES[d.getMonth()]} ${y}`;
    list.push({ month, label });
  }
  return list;
}

/**
 * GET /api/reports/my/monthly?months=6 (role: user)
 * For the last N months (include months with 0), returns:
 * [{ month: "2026-09", label: "Sep 2026", total_kg, collections_count }]
 * plus totals { total_kg, total_collections } and estimated compost_made_kg = 40% of total_kg.
 */
const getMyMonthlyReport = async (req, res) => {
  try {
    const monthsCount = Math.min(Math.max(Number(req.query.months) || 6, 1), 24);
    const monthSlots = getLastNMonths(monthsCount);
    const earliestMonth = monthSlots[0].month;

    // Fetch waste records grouped by YYYY-MM for this user's collections
    const [rows] = await db.query(
      `SELECT 
         DATE_FORMAT(wr.recorded_at, '%Y-%m') AS month,
         COALESCE(SUM(wr.weight_kg), 0) AS total_kg,
         COUNT(wr.id) AS collections_count
       FROM waste_records wr
       JOIN collection_requests cr ON wr.collection_id = cr.id
       WHERE cr.user_id = ? AND DATE_FORMAT(wr.recorded_at, '%Y-%m') >= ?
       GROUP BY DATE_FORMAT(wr.recorded_at, '%Y-%m')`,
      [req.user.id, earliestMonth]
    );

    const dataMap = {};
    for (const r of rows) {
      dataMap[r.month] = {
        total_kg: Number(r.total_kg),
        collections_count: Number(r.collections_count)
      };
    }

    let overallKg = 0;
    let overallCollections = 0;

    const monthly = monthSlots.map(slot => {
      const entry = dataMap[slot.month] || { total_kg: 0, collections_count: 0 };
      overallKg += entry.total_kg;
      overallCollections += entry.collections_count;
      return {
        month: slot.month,
        label: slot.label,
        total_kg: Math.round(entry.total_kg * 100) / 100,
        collections_count: entry.collections_count
      };
    });

    const roundedKg = Math.round(overallKg * 100) / 100;
    const compostMadeKg = Math.round(roundedKg * 0.40 * 100) / 100;

    return ok(res, {
      monthly,
      totals: {
        total_kg: roundedKg,
        total_collections: overallCollections,
        compost_made_kg: compostMadeKg,
        estimate_note: 'Estimated compost yield (approx. 40% of collected organic waste)'
      }
    });
  } catch (error) {
    console.error('getMyMonthlyReport error:', error);
    return fail(res, 500, 'Failed to fetch user monthly report');
  }
};

/**
 * GET /api/admin/dashboard (admin)
 * Returns {
 *   total_users, total_drivers, total_bins, pending_requests,
 *   total_waste_kg, total_orders, requests_by_status, waste_by_type,
 *   monthly_waste, recent_requests, recent_orders, full_bins, recent_feedback
 * }
 */
const getAdminDashboard = async (req, res) => {
  try {
    // 1. Core counters
    const [userRows] = await db.query(
      "SELECT COUNT(*) AS count FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'user'"
    );
    const [driverRows] = await db.query(
      'SELECT COUNT(*) AS count FROM drivers WHERE is_active = TRUE'
    );
    const [binRows] = await db.query(
      "SELECT COUNT(*) AS count FROM bins WHERE status = 'active'"
    );
    const [pendingRows] = await db.query(
      "SELECT COUNT(*) AS count FROM collection_requests WHERE status = 'pending'"
    );
    const [wasteRows] = await db.query(
      'SELECT COALESCE(SUM(weight_kg), 0) AS total_kg FROM waste_records'
    );
    const [orderRows] = await db.query(
      'SELECT COUNT(*) AS count FROM orders'
    );

    // 2. requests_by_status
    const [statusRows] = await db.query(
      'SELECT status, COUNT(*) AS count FROM collection_requests GROUP BY status'
    );
    const requestsByStatus = {
      pending: 0,
      approved: 0,
      driver_assigned: 0,
      collected: 0,
      cancelled: 0
    };
    for (const r of statusRows) {
      if (requestsByStatus[r.status] !== undefined) {
        requestsByStatus[r.status] = Number(r.count);
      }
    }

    // 3. waste_by_type
    const [typeRows] = await db.query(
      'SELECT waste_type AS type, COALESCE(SUM(weight_kg), 0) AS kg FROM waste_records GROUP BY waste_type'
    );
    const wasteByType = typeRows.map(r => ({
      type: r.type,
      kg: Math.round(Number(r.kg) * 100) / 100
    }));

    // 4. monthly_waste (last 6 months)
    const monthSlots = getLastNMonths(6);
    const earliestMonth = monthSlots[0].month;

    const [monthlyWasteRows] = await db.query(
      `SELECT 
         DATE_FORMAT(recorded_at, '%Y-%m') AS month,
         COALESCE(SUM(weight_kg), 0) AS kg
       FROM waste_records
       WHERE DATE_FORMAT(recorded_at, '%Y-%m') >= ?
       GROUP BY DATE_FORMAT(recorded_at, '%Y-%m')`,
      [earliestMonth]
    );

    const wasteMap = {};
    for (const r of monthlyWasteRows) {
      wasteMap[r.month] = Number(r.kg);
    }

    const monthlyWaste = monthSlots.map(slot => ({
      label: slot.label,
      month: slot.month,
      kg: Math.round((wasteMap[slot.month] || 0) * 100) / 100
    }));

    // 5. recent_requests (5)
    const [recentRequests] = await db.query(`
      SELECT cr.id, cr.user_id, u.name AS user_name, b.location AS bin_location,
             cr.waste_type, cr.status, cr.requested_at
      FROM collection_requests cr
      JOIN users u ON cr.user_id = u.id
      LEFT JOIN bins b ON cr.bin_id = b.id
      ORDER BY cr.requested_at DESC, cr.id DESC
      LIMIT 5
    `);

    // 6. recent_orders (5)
    const [recentOrders] = await db.query(`
      SELECT o.id, o.user_id, u.name AS user_name, o.order_date,
             o.status, o.total_amount
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.order_date DESC, o.id DESC
      LIMIT 5
    `);

    // 7. full_bins (up to 5 bins with fill_status full and active)
    const [fullBins] = await db.query(`
      SELECT b.id, b.location, b.capacity_kg, b.current_level, b.fill_status,
             u.name AS owner_name, u.phone AS owner_phone
      FROM bins b
      JOIN user_bins ub ON b.id = ub.bin_id AND ub.is_active = TRUE
      JOIN users u ON ub.user_id = u.id
      WHERE b.fill_status = 'full' AND b.status = 'active'
      ORDER BY b.id DESC
      LIMIT 5
    `);

    // 8. recent_feedback (5)
    const [recentFeedback] = await db.query(`
      SELECT fc.id, fc.user_id, u.name AS user_name, fc.type, fc.message,
             fc.rating, fc.status, fc.created_at
      FROM feedback_complaints fc
      JOIN users u ON fc.user_id = u.id
      ORDER BY fc.created_at DESC, fc.id DESC
      LIMIT 5
    `);

    return ok(res, {
      total_users: Number(userRows[0].count),
      total_drivers: Number(driverRows[0].count),
      total_bins: Number(binRows[0].count),
      pending_requests: Number(pendingRows[0].count),
      total_waste_kg: Math.round(Number(wasteRows[0].total_kg) * 100) / 100,
      total_orders: Number(orderRows[0].count),
      requests_by_status: requestsByStatus,
      waste_by_type: wasteByType,
      monthly_waste: monthlyWaste,
      recent_requests: recentRequests,
      recent_orders: recentOrders,
      full_bins: fullBins,
      recent_feedback: recentFeedback
    });
  } catch (error) {
    console.error('getAdminDashboard error:', error);
    return fail(res, 500, 'Failed to fetch admin dashboard stats');
  }
};

/**
 * Helper to fetch monthly report data and record report generation row.
 */
async function computeMonthlyReportData(monthStr, userId) {
  const periodStart = `${monthStr}-01`;

  // 1. collections_count & total_kg
  const [colRows] = await db.query(
    `SELECT COUNT(wr.id) AS collections_count, COALESCE(SUM(wr.weight_kg), 0) AS total_kg
     FROM waste_records wr
     WHERE DATE_FORMAT(wr.recorded_at, '%Y-%m') = ?`,
    [monthStr]
  );

  // 2. by_type
  const [typeRows] = await db.query(
    `SELECT waste_type, COUNT(*) AS count, COALESCE(SUM(weight_kg), 0) AS total_kg
     FROM waste_records
     WHERE DATE_FORMAT(recorded_at, '%Y-%m') = ?
     GROUP BY waste_type`,
    [monthStr]
  );

  // 3. by_driver
  const [driverRows] = await db.query(
    `SELECT d.id AS driver_id, du.name AS driver,
            COUNT(wr.id) AS count, COALESCE(SUM(wr.weight_kg), 0) AS kg
     FROM waste_records wr
     JOIN drivers d ON wr.driver_id = d.id
     JOIN users du ON d.user_id = du.id
     WHERE DATE_FORMAT(wr.recorded_at, '%Y-%m') = ?
     GROUP BY d.id, du.name`,
    [monthStr]
  );

  // 4. orders_count
  const [orderRows] = await db.query(
    `SELECT COUNT(*) AS count FROM orders WHERE DATE_FORMAT(order_date, '%Y-%m') = ?`,
    [monthStr]
  );

  // 5. revenue (successful payments for orders + subscriptions)
  const [revRows] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS revenue 
     FROM payments 
     WHERE status = 'success' AND DATE_FORMAT(paid_at, '%Y-%m') = ?`,
    [monthStr]
  );

  // 6. subscriptions_count
  const [subRows] = await db.query(
    `SELECT COUNT(*) AS count FROM subscriptions WHERE DATE_FORMAT(created_at, '%Y-%m') = ?`,
    [monthStr]
  );

  // 7. compost_output_kg
  const [compostRows] = await db.query(
    `SELECT COALESCE(SUM(output_weight_kg), 0) AS compost_output_kg
     FROM compost_batches
     WHERE status = 'completed' AND DATE_FORMAT(completed_at, '%Y-%m') = ?`,
    [monthStr]
  );

  // Insert a row into the reports table every time a monthly report is requested
  await db.query(
    `INSERT INTO reports (report_type, period_start, period_end, generated_by, file_url, generated_at)
     VALUES ('monthly_collection', ?, LAST_DAY(?), ?, NULL, NOW())`,
    [periodStart, periodStart, userId]
  );

  return {
    month: monthStr,
    collections_count: Number(colRows[0].collections_count),
    total_kg: Math.round(Number(colRows[0].total_kg) * 100) / 100,
    by_type: typeRows.map(t => ({
      waste_type: t.waste_type,
      count: Number(t.count),
      total_kg: Math.round(Number(t.total_kg) * 100) / 100
    })),
    by_driver: driverRows.map(d => ({
      driver_id: d.driver_id,
      driver: d.driver,
      count: Number(d.count),
      kg: Math.round(Number(d.kg) * 100) / 100
    })),
    orders_count: Number(orderRows[0].count),
    revenue: Math.round(Number(revRows[0].revenue) * 100) / 100,
    subscriptions_count: Number(subRows[0].count),
    compost_output_kg: Math.round(Number(compostRows[0].compost_output_kg) * 100) / 100
  };
}

/**
 * GET /api/admin/reports/monthly?month=YYYY-MM (admin)
 */
const getAdminMonthlyReport = async (req, res) => {
  try {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetMonth = req.query.month && /^\d{4}-\d{2}$/.test(req.query.month.trim())
      ? req.query.month.trim()
      : defaultMonth;

    const reportData = await computeMonthlyReportData(targetMonth, req.user.id);
    return ok(res, reportData);
  } catch (error) {
    console.error('getAdminMonthlyReport error:', error);
    return fail(res, 500, 'Failed to generate monthly report');
  }
};

/**
 * GET /api/admin/reports/export?month=YYYY-MM (admin)
 * Returns the report data as downloadable CSV.
 */
const exportMonthlyReportCsv = async (req, res) => {
  try {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetMonth = req.query.month && /^\d{4}-\d{2}$/.test(req.query.month.trim())
      ? req.query.month.trim()
      : defaultMonth;

    const data = await computeMonthlyReportData(targetMonth, req.user.id);

    // Format CSV
    let csv = `Smart Garbage Management System - Monthly Report (${targetMonth})\n\n`;
    csv += 'Summary Metric,Value\n';
    csv += `Collections Count,${data.collections_count}\n`;
    csv += `Total Waste Collected (kg),${data.total_kg}\n`;
    csv += `Orders Count,${data.orders_count}\n`;
    csv += `Total Revenue (INR),${data.revenue}\n`;
    csv += `Subscriptions Activated,${data.subscriptions_count}\n`;
    csv += `Compost Produced (kg),${data.compost_output_kg}\n\n`;

    csv += 'Waste Breakdown By Type\n';
    csv += 'Waste Type,Record Count,Weight (kg)\n';
    for (const t of data.by_type) {
      csv += `"${t.waste_type}",${t.count},${t.total_kg}\n`;
    }
    csv += '\n';

    csv += 'Waste Collection By Driver\n';
    csv += 'Driver Name,Pickups Completed,Total Weight (kg)\n';
    for (const d of data.by_driver) {
      csv += `"${d.driver}",${d.count},${d.kg}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sgms-report-${targetMonth}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('exportMonthlyReportCsv error:', error);
    return fail(res, 500, 'Failed to export monthly report CSV');
  }
};

module.exports = {
  getMyMonthlyReport,
  getAdminDashboard,
  getAdminMonthlyReport,
  exportMonthlyReportCsv
};
