const express = require('express');
const adminCollectionController = require('../controllers/adminCollectionController');
const { protect, requireRole } = require('../middleware/auth');

// Admin collections router (/api/admin/collections)
const adminCollectionRouter = express.Router();
adminCollectionRouter.use(protect, requireRole('admin'));

adminCollectionRouter.get('/', adminCollectionController.listRequests);
adminCollectionRouter.put('/:id/approve', adminCollectionController.approveRequest);
adminCollectionRouter.get('/:id/nearby-drivers', adminCollectionController.getNearbyDrivers);
adminCollectionRouter.put('/:id/assign', adminCollectionController.assignDriver);
adminCollectionRouter.put('/:id/cancel', adminCollectionController.adminCancelRequest);

// Admin waste-records router (/api/admin/waste-records)
const adminWasteRecordRouter = express.Router();
adminWasteRecordRouter.use(protect, requireRole('admin'));

adminWasteRecordRouter.get('/', adminCollectionController.listWasteRecords);
adminWasteRecordRouter.put('/:id', adminCollectionController.updateWasteRecord);

module.exports = {
  adminCollectionRouter,
  adminWasteRecordRouter
};
