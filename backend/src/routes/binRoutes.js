const express = require('express');
const binController = require('../controllers/binController');
const { protect, requireRole } = require('../middleware/auth');

// User bins router (/api/bins)
const binRouter = express.Router();
binRouter.post('/', protect, requireRole('user'), binController.createBin);
binRouter.get('/my', protect, requireRole('user'), binController.getMyBins);
binRouter.put('/:id', protect, requireRole('user'), binController.updateBin);
binRouter.put('/:id/status', protect, requireRole('user'), binController.updateBinStatus);
binRouter.get('/:id/history', protect, requireRole('user'), binController.getBinHistory);
binRouter.delete('/:id', protect, requireRole('user'), binController.deleteBin);

// Admin bins router (/api/admin/bins)
const adminBinRouter = express.Router();
adminBinRouter.get('/', protect, requireRole('admin'), binController.getAdminBins);

module.exports = {
  binRouter,
  adminBinRouter
};
