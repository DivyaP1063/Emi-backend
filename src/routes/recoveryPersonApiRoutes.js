const express = require('express');
const router = express.Router();
const { authenticateRecoveryPerson } = require('../middleware/auth');
const { otpRateLimiter } = require('../middleware/rateLimiter');
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
const { collectDevice, collectDeviceValidation } = require('../controllers/recoveryPersonController');
router.post(
    '/collect-device',
    authenticateRecoveryPerson,
    collectDeviceValidation,
    collectDevice
);

// Protected routes (require authentication) can be added here
// Example:
// router.get('/profile', authenticateRecoveryPerson, getProfile);

module.exports = router;
