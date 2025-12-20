const express = require('express');
const router = express.Router();
const { authenticateAccountant } = require('../middleware/auth');
const { otpRateLimiter } = require('../middleware/rateLimiter');
const accountantAuthController = require('../controllers/accountantAuthController');
const accountantEmiController = require('../controllers/accountantEmiController');

console.log('📋 Loading accountant API routes...');

/**
 * @route   POST /api/accountant/auth/send-otp
 * @desc    Send OTP to accountant mobile number
 * @access  Public
 */
router.post(
    '/auth/send-otp',
    otpRateLimiter,
    accountantAuthController.sendOtpValidation,
    accountantAuthController.sendOtpController
);

/**
 * @route   POST /api/accountant/auth/verify-otp
 * @desc    Verify OTP and login accountant
 * @access  Public
 */
router.post(
    '/auth/verify-otp',
    accountantAuthController.verifyOtpValidation,
    accountantAuthController.verifyOtpController
);

/**
 * @route   GET /api/accountant/customers
 * @desc    Get all customers with pagination
 * @access  Protected (Accountant only)
 */
router.get(
    '/customers',
    authenticateAccountant,
    accountantEmiController.getCustomers
);

/**
 * @route   GET /api/accountant/customers/pending-emi
 * @desc    Get customers with pending EMI payments
 * @access  Protected (Accountant only)
 */
router.get(
    '/customers/pending-emi',
    authenticateAccountant,
    accountantEmiController.getPendingEmiCustomers
);

/**
 * @route   PUT /api/accountant/customers/:customerId/emi/:monthNumber
 * @desc    Update EMI payment status
 * @access  Protected (Accountant only)
 */
router.put(
    '/customers/:customerId/emi/:monthNumber',
    authenticateAccountant,
    accountantEmiController.updateEmiPaymentStatus
);

module.exports = router;
