const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { otpRateLimiter } = require('../middleware/rateLimiter');
const {
    sendOtpForAccountant,
    verifyOtpForAccountant,
    createAccountant,
    getAllAccountants,
    updateAccountantStatus,
    sendOtpValidation,
    verifyOtpValidation,
    createAccountantValidation
} = require('../controllers/accountantController');

/**
 * @route   POST /api/admin/accountants/send-otp
 * @desc    Send OTP to mobile number for verification
 * @access  Protected (Admin only)
 */
router.post(
    '/send-otp',
    authenticate,
    otpRateLimiter,
    sendOtpValidation,
    sendOtpForAccountant
);

/**
 * @route   POST /api/admin/accountants/verify-otp
 * @desc    Verify OTP for mobile number (marks as verified, must pass to proceed)
 * @access  Protected (Admin only)
 */
router.post(
    '/verify-otp',
    authenticate,
    verifyOtpValidation,
    verifyOtpForAccountant
);

/**
 * @route   POST /api/admin/accountants
 * @desc    Create accountant with all data (fullName, aadharNumber, mobileNumber)
 * @access  Protected (Admin only)
 */
router.post(
    '/',
    authenticate,
    createAccountantValidation,
    createAccountant
);

/**
 * @route   GET /api/admin/accountants
 * @desc    Get all accountants with pagination
 * @access  Protected (Admin only)
 */
router.get(
    '/',
    authenticate,
    getAllAccountants
);

/**
 * @route   PUT /api/admin/accountants/:accountantId/status
 * @desc    Update accountant status (activate/deactivate)
 * @access  Protected (Admin only)
 */
router.put(
    '/:accountantId/status',
    authenticate,
    updateAccountantStatus
);

module.exports = router;
