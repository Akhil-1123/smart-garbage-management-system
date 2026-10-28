const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const { protect, requireRole } = require('../middleware/auth');

// All collection routes for users require role "user"
router.use(protect, requireRole('user'));

router.post('/', collectionController.createRequest);
router.get('/my', collectionController.getMyRequests);
router.get('/:id', collectionController.getRequestById);
router.put('/:id/cancel', collectionController.cancelRequest);

module.exports = router;
