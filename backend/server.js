const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const errorHandler = require('./src/middleware/errorHandler');
const { runSubscriptionExpiryNotifications } = require('./src/utils/subscriptions');

// Phase 2 Route imports
const authRoutes = require('./src/routes/authRoutes');
const adminUserRoutes = require('./src/routes/adminUserRoutes');
const adminDriverRoutes = require('./src/routes/adminDriverRoutes');
const {
  plansRouter,
  subscriptionRouter,
  adminSubscriptionRouter
} = require('./src/routes/subscriptionRoutes');
const {
  binRouter,
  adminBinRouter
} = require('./src/routes/binRoutes');

// Phase 3 Route imports
const collectionRoutes = require('./src/routes/collectionRoutes');
const {
  adminCollectionRouter,
  adminWasteRecordRouter
} = require('./src/routes/adminCollectionRoutes');
const driverRoutes = require('./src/routes/driverRoutes');
const compostingRoutes = require('./src/routes/compostingRoutes');

// Phase 4 Route imports
const {
  categoryRouter,
  productRouter,
  adminCategoryRouter,
  adminProductRouter
} = require('./src/routes/productRoutes');
const {
  orderRouter,
  adminOrderRouter,
  adminPaymentRouter
} = require('./src/routes/orderRoutes');
const {
  feedbackRouter,
  adminFeedbackRouter
} = require('./src/routes/feedbackRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const {
  userReportRouter,
  adminDashboardRouter,
  adminReportRouter
} = require('./src/routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint (Phase 1)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Phase 2 Route registrations
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/drivers', adminDriverRoutes);
app.use('/api/subscription-plans', plansRouter);
app.use('/api/subscriptions', subscriptionRouter);
app.use('/api/admin/subscriptions', adminSubscriptionRouter);
app.use('/api/bins', binRouter);
app.use('/api/admin/bins', adminBinRouter);

// Phase 3 Route registrations
app.use('/api/collections', collectionRoutes);
app.use('/api/admin/collections', adminCollectionRouter);
app.use('/api/admin/waste-records', adminWasteRecordRouter);
app.use('/api/driver', driverRoutes);
app.use('/api/admin/composting', compostingRoutes);

// Phase 4 Route registrations
// Marketplace
app.use('/api/categories', categoryRouter);
app.use('/api/products', productRouter);
app.use('/api/admin/categories', adminCategoryRouter);
app.use('/api/admin/products', adminProductRouter);

// Orders & Payments
app.use('/api/orders', orderRouter);
app.use('/api/admin/orders', adminOrderRouter);
app.use('/api/admin/payments', adminPaymentRouter);

// Feedback & Complaints
app.use('/api/feedback', feedbackRouter);
app.use('/api/admin/feedback', adminFeedbackRouter);

// Notifications
app.use('/api/notifications', notificationRoutes);

// Reports & Dashboard
app.use('/api/reports', userReportRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);
app.use('/api/admin/reports', adminReportRouter);

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`SGMS Backend server is running on port ${PORT}`);
    runSubscriptionExpiryNotifications().catch((error) => {
      console.error('Initial subscription expiry notification run failed:', error);
    });
    setInterval(() => {
      runSubscriptionExpiryNotifications().catch((error) => {
        console.error('Scheduled subscription expiry notification run failed:', error);
      });
    }, 60 * 60 * 1000);
  });
}

module.exports = app;
