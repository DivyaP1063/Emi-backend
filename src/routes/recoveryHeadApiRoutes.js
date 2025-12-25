const express = require('express');
const router = express.Router();
const {
    sendOtpController,
    verifyOtpController,
    sendOtpValidation,
    verifyOtpValidation
} = require('../controllers/recoveryHeadAuthController');
const { getAssignedCustomers } = require('../controllers/recoveryHeadController');
const { authenticateRecoveryHead } = require('../middleware/auth');

// POST /api/recovery-head/send-otp - Send OTP to recovery head mobile
router.post('/send-otp', sendOtpValidation, sendOtpController);

// POST /api/recovery-head/verify-otp - Verify OTP and login
router.post('/verify-otp', verifyOtpValidation, verifyOtpController);

// GET /api/recovery-head/assigned-customers - Get all assigned customers (Protected)
router.get('/assigned-customers', authenticateRecoveryHead, getAssignedCustomers);

module.exports = router;
