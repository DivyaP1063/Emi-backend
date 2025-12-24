const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    createRecoveryHead,
    getAllRecoveryHeads,
    createRecoveryHeadValidation,
    assignCustomersToRecoveryHeads
} = require('../controllers/recoveryHeadController');

// All recovery head routes require authentication
router.use(authenticate);

// POST /api/admin/recovery-heads - Create new recovery head
router.post('/', createRecoveryHeadValidation, createRecoveryHead);

// GET /api/admin/recovery-heads - Get all recovery heads
router.get('/', getAllRecoveryHeads);

// POST /api/admin/recovery-heads/assign-customers - Assign locked customers to recovery heads
router.post('/assign-customers', assignCustomersToRecoveryHeads);

module.exports = router;
