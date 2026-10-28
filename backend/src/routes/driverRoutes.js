const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { protect, requireRole } = require('../middleware/auth');

// Protect and require role "driver", then resolve driver profile row (403 if none)
router.use(protect, requireRole('driver'), driverController.resolveDriverProfile);

router.get('/profile', driverController.getProfile);
router.put('/availability', driverController.setAvailability);
router.get('/collections', driverController.getAssignedCollections);
router.put('/collections/:id/collect', driverController.collectRequest);
router.get('/history', driverController.getHistory);

module.exports = router;
