const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const pincodeController = require('../controllers/pincodeController');

/**
 * @route   POST /api/admin/pincodes
 * @desc    Create a new pincode
 * @access  Admin
 */
router.post(
    '/pincodes',
    authenticate,
    pincodeController.createPincodeValidation,
    pincodeController.createPincode
);

/**
 * @route   GET /api/admin/pincodes
 * @desc    Get all pincodes with pagination, search, and filtering
 * @access  Admin
 */
router.get(
    '/pincodes',
    authenticate,
    pincodeController.getAllPincodes
);

/**
 * @route   GET /api/admin/pincodes/:pincodeId
 * @desc    Get single pincode by ID
 * @access  Admin
 */
router.get(
    '/pincodes/:pincodeId',
    authenticate,
    pincodeController.getPincodeById
);

/**
 * @route   PUT /api/admin/pincodes/:pincodeId
 * @desc    Update pincode
 * @access  Admin
 */
router.put(
    '/pincodes/:pincodeId',
    authenticate,
    pincodeController.updatePincodeValidation,
    pincodeController.updatePincode
);

/**
 * @route   DELETE /api/admin/pincodes/:pincodeId
 * @desc    Delete pincode (soft delete)
 * @access  Admin
 */
router.delete(
    '/pincodes/:pincodeId',
    authenticate,
    pincodeController.deletePincode
);

module.exports = router;
