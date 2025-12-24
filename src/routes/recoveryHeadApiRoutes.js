const express = require('express');
const router = express.Router();
const {
    sendOtpController,
    verifyOtpController,
    sendOtpValidation,
    verifyOtpValidation
} = require('../controllers/recoveryHeadAuthController');

// POST /api/recovery-head/send-otp - Send OTP to recovery head mobile
router.post('/send-otp', sendOtpValidation, sendOtpController);

// POST /api/recovery-head/verify-otp - Verify OTP and login
router.post('/verify-otp', verifyOtpValidation, verifyOtpController);

module.exports = router;
