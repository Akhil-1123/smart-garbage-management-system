const express = require('express');
const router = express.Router();
const adminDriverController = require('../controllers/adminDriverController');
const { protect, requireRole } = require('../middleware/auth');

// All routes require admin role
router.use(protect, requireRole('admin'));

router.get('/', adminDriverController.listDrivers);
router.post('/', adminDriverController.createDriver);
router.put('/:id', adminDriverController.updateDriver);
router.put('/:id/toggle-active', adminDriverController.toggleDriverActive);

module.exports = router;
