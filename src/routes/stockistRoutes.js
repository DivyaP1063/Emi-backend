const express = require('express');
const router = express.Router();
const {
    sendOtpController,
    verifyOtpController,
    sendOtpValidation,
    verifyOtpValidation
} = require('../controllers/stockistAuthController');

// Send OTP
router.post('/send-otp', sendOtpValidation, sendOtpController);

// Verify OTP and login
router.post('/verify-otp', verifyOtpValidation, verifyOtpController);

module.exports = router;
