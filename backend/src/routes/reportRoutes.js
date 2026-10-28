const express = require('express');
const reportController = require('../controllers/reportController');
const { protect, requireRole } = require('../middleware/auth');

// User Reports Router (/api/reports) - role "user"
const userReportRouter = express.Router();
userReportRouter.use(protect, requireRole('user'));
userReportRouter.get('/my/monthly', reportController.getMyMonthlyReport);

// Admin Dashboard Router (/api/admin/dashboard) - role "admin"
const adminDashboardRouter = express.Router();
adminDashboardRouter.use(protect, requireRole('admin'));
adminDashboardRouter.get('/', reportController.getAdminDashboard);

// Admin Reports Router (/api/admin/reports) - role "admin"
const adminReportRouter = express.Router();
adminReportRouter.use(protect, requireRole('admin'));
adminReportRouter.get('/monthly', reportController.getAdminMonthlyReport);
adminReportRouter.get('/export', reportController.exportMonthlyReportCsv);

module.exports = {
  userReportRouter,
  adminDashboardRouter,
  adminReportRouter
};
