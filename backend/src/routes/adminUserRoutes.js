const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { protect, requireRole } = require('../middleware/auth');

// All routes here require admin role
router.use(protect, requireRole('admin'));

router.get('/', adminUserController.listUsers);
router.put('/:id/toggle-active', adminUserController.toggleUserActive);

module.exports = router;
