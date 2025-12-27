const express = require('express');
const router = express.Router();
const { authenticateRecoveryPerson } = require('../middleware/auth');
const { otpRateLimiter } = require('../middleware/rateLimiter');
const { uploadDeviceImages } = require('../middleware/upload');
const recoveryPersonAuthController = require('../controllers/recoveryPersonAuthController');

console.log('📋 Loading recovery person API routes...');

/**
 * @route   POST /api/recovery-person/auth/send-otp
 * @desc    Send OTP to recovery person mobile number
 * @access  Public
 */
router.post(
    '/auth/send-otp',
    otpRateLimiter,
    recoveryPersonAuthController.sendOtpValidation,
    recoveryPersonAuthController.sendOtpController
);

/**
 * @route   POST /api/recovery-person/auth/verify-otp
 * @desc    Verify OTP and login recovery person
 * @access  Public
 */
router.post(
    '/auth/verify-otp',
    recoveryPersonAuthController.verifyOtpValidation,
    recoveryPersonAuthController.verifyOtpController
);

/**
 * @route   POST /api/recovery-person/collect-device
 * @desc    Collect device from customer
 * @access  Private (Recovery Person)
 */
const {
    collectDevice,
    collectDeviceValidation,
    getAssignedCustomers,
    getDashboardStats,
    getCustomerDetails,
    getCustomerLocation
} = require('../controllers/recoveryPersonController');
router.post(
    '/collect-device',
    authenticateRecoveryPerson,
    uploadDeviceImages,
    collectDeviceValidation,
    collectDevice
);

/**
 * @route   GET /api/recovery-person/customers
 * @desc    Get all customers assigned to recovery person
 * @access  Private (Recovery Person)
 */
router.get(
    '/customers',
    authenticateRecoveryPerson,
    getAssignedCustomers
);

/**
 * @route   GET /api/recovery-person/customers/:customerId
 * @desc    Get complete details of a specific customer
 * @access  Private (Recovery Person)
 */
router.get(
    '/customers/:customerId',
    authenticateRecoveryPerson,
    getCustomerDetails
);

/**
 * @route   GET /api/recovery-person/customers/:customerId/location
 * @desc    Get device location (lat/lng) for a specific customer
 * @access  Private (Recovery Person)
 */
router.get(
    '/customers/:customerId/location',
    authenticateRecoveryPerson,
    getCustomerLocation
);

/**
 * @route   GET /api/recovery-person/dashboard
 * @desc    Get dashboard statistics (assigned and collected counts)
 * @access  Private (Recovery Person)
 */
router.get(
    '/dashboard',
    authenticateRecoveryPerson,
    getDashboardStats
);

// Protected routes (require authentication) can be added here
// Example:
// router.get('/profile', authenticateRecoveryPerson, getProfile);

module.exports = router;
