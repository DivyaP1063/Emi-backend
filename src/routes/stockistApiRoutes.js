const express = require('express');
const router = express.Router();
const { authenticateStockist } = require('../middleware/auth');
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

// All routes require stockist authentication
router.use(authenticateStockist);

// Dashboard statistics
router.get('/dashboard', getDashboardStats);

// Submitted devices list
router.get('/submitted-devices', getSubmittedDevices);

// Device details
router.get('/device/:submissionId', getDeviceDetails);

// Mark customer retrieved device
router.post('/customer-retrieved', markCustomerRetrievedValidation, markCustomerRetrieved);

// Send device to repair
router.post('/send-to-repair', sendToRepairValidation, sendToRepair);

// Send device to resell
router.post('/send-to-resell', sendToResellValidation, sendToResell);

// Transaction history
router.get('/transaction-history', getTransactionHistory);

module.exports = router;
