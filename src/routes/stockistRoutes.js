const express = require('express');
const router = express.Router();
const { authenticateStockist } = require('../middleware/auth');

// Import auth controller
const {
    sendOtpController,
    verifyOtpController,
    sendOtpValidation,
    verifyOtpValidation
} = require('../controllers/stockistAuthController');

// Import stockist controller
const {
    getDashboardStats,
    getSubmittedDevices,
    getDeviceDetails,
    markCustomerRetrieved,
    markCustomerRetrievedValidation,
    sendToRepair,
    sendToRepairValidation,
    sendToResell,
    sendToResellValidation,
    getTransactionHistory
} = require('../controllers/stockistController');

// ============================================
// PUBLIC ROUTES (Authentication)
// ============================================

// Send OTP
router.post('/send-otp', sendOtpValidation, sendOtpController);

// Verify OTP and login
router.post('/verify-otp', verifyOtpValidation, verifyOtpController);

// ============================================
// PROTECTED ROUTES (Require Authentication)
// ============================================

// Dashboard statistics
router.get('/dashboard', authenticateStockist, getDashboardStats);

// Submitted devices list
router.get('/submitted-devices', authenticateStockist, getSubmittedDevices);

// Device details
router.get('/device/:submissionId', authenticateStockist, getDeviceDetails);

// Mark customer retrieved device
router.post('/customer-retrieved', authenticateStockist, markCustomerRetrievedValidation, markCustomerRetrieved);

// Send device to repair
router.post('/send-to-repair', authenticateStockist, sendToRepairValidation, sendToRepair);

// Send device to resell
router.post('/send-to-resell', authenticateStockist, sendToResellValidation, sendToResell);

// Transaction history
router.get('/transaction-history', authenticateStockist, getTransactionHistory);

module.exports = router;
