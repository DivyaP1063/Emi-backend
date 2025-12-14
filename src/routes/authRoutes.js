const express = require('express');
const router = express.Router();
const { otpRateLimiter } = require('../middleware/rateLimiter');
const {
  sendOtpController,
  verifyOtpController,
  sendOtpValidation,
  verifyOtpValidation
} = require('../controllers/authController');

// POST /api/admin/auth/send-otp
router.post('/send-otp', otpRateLimiter, sendOtpValidation, sendOtpController);

// POST /api/admin/auth/verify-otp
router.post('/verify-otp', verifyOtpValidation, verifyOtpController);

module.exports = router;
