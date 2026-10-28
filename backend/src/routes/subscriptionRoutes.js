const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const { protect, requireRole } = require('../middleware/auth');

// Public subscription plans router (/api/subscription-plans)
const plansRouter = express.Router();
plansRouter.get('/', subscriptionController.getPlans);

// User subscriptions router (/api/subscriptions)
const subscriptionRouter = express.Router();
subscriptionRouter.post('/', protect, requireRole('user'), subscriptionController.subscribe);
subscriptionRouter.get('/my', protect, requireRole('user'), subscriptionController.getMySubscriptions);
subscriptionRouter.put('/:id/cancel', protect, requireRole('user'), subscriptionController.cancelSubscription);

// Admin subscriptions router (/api/admin/subscriptions)
const adminSubscriptionRouter = express.Router();
adminSubscriptionRouter.get('/', protect, requireRole('admin'), subscriptionController.getAdminSubscriptions);

module.exports = {
  plansRouter,
  subscriptionRouter,
  adminSubscriptionRouter
};
