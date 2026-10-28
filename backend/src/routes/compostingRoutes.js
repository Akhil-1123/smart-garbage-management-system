const express = require('express');
const router = express.Router();
const compostingController = require('../controllers/compostingController');
const { protect, requireRole } = require('../middleware/auth');

// All composting routes require admin role
router.use(protect, requireRole('admin'));

router.get('/units', compostingController.getUnits);
router.post('/units', compostingController.createUnit);
router.put('/units/:id', compostingController.updateUnit);

router.get('/pending-waste', compostingController.getPendingWaste);
router.get('/batches', compostingController.getBatches);
router.post('/batches', compostingController.createBatch);
router.put('/batches/:id/complete', compostingController.completeBatch);

module.exports = router;
