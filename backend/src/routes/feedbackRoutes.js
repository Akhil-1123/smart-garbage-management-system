const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const { protect, requireRole } = require('../middleware/auth');

// User Feedback Router (/api/feedback) - role "user"
const feedbackRouter = express.Router();
feedbackRouter.use(protect, requireRole('user'));

feedbackRouter.post('/', feedbackController.submitFeedback);
feedbackRouter.get('/my', feedbackController.getMyFeedback);
feedbackRouter.get('/rateable', feedbackController.getRateableCollections);

// Admin Feedback Router (/api/admin/feedback) - role "admin"
const adminFeedbackRouter = express.Router();
adminFeedbackRouter.use(protect, requireRole('admin'));

adminFeedbackRouter.get('/', feedbackController.getAdminFeedback);
adminFeedbackRouter.put('/:id', feedbackController.updateFeedbackStatus);

module.exports = {
  feedbackRouter,
  adminFeedbackRouter
};
