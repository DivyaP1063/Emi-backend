const express = require('express');
const router = express.Router();
const { authenticateRecoveryHead } = require('../middleware/auth');
const {
    createRecoveryPerson,
    getAllRecoveryPersons,
    updateRecoveryPersonStatus,
    createRecoveryPersonValidation
} = require('../controllers/recoveryPersonController');

// All routes require recovery head authentication
router.use(authenticateRecoveryHead);

/**
 * @route   POST /api/recovery-head/recovery-persons
 * @desc    Create new recovery person
 * @access  Protected (Recovery Head only)
 */
router.post(
    '/',
    createRecoveryPersonValidation,
    createRecoveryPerson
);

/**
 * @route   GET /api/recovery-head/recovery-persons
 * @desc    Get all recovery persons for authenticated recovery head
 * @access  Protected (Recovery Head only)
 */
router.get('/', getAllRecoveryPersons);

/**
 * @route   PUT /api/recovery-head/recovery-persons/:recoveryPersonId/status
 * @desc    Update recovery person status (activate/deactivate)
 * @access  Protected (Recovery Head only)
 */
router.put('/:recoveryPersonId/status', updateRecoveryPersonStatus);

module.exports = router;
