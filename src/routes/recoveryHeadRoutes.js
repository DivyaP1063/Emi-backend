const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    createRecoveryHead,
    getAllRecoveryHeads,
    createRecoveryHeadValidation,
    assignCustomersToRecoveryHeads,
    debugLockedCustomers,
    fixLockedCustomersAssignment
} = require('../controllers/recoveryHeadController');

// All recovery head routes require authentication
router.use(authenticate);

// POST /api/admin/recovery-heads - Create new recovery head
router.post('/', createRecoveryHeadValidation, createRecoveryHead);

// GET /api/admin/recovery-heads - Get all recovery heads
router.get('/', getAllRecoveryHeads);

// POST /api/admin/recovery-heads/assign-customers - Assign locked customers to recovery heads
router.post('/assign-customers', assignCustomersToRecoveryHeads);

// GET /api/admin/recovery-heads/debug-locked - Debug locked customers (temporary)
router.get('/debug-locked', debugLockedCustomers);

// POST /api/admin/recovery-heads/fix-assignment - Fix existing locked customers (one-time migration)
router.post('/fix-assignment', fixLockedCustomersAssignment);

module.exports = router;
