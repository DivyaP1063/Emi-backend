const express = require('express');
const router = express.Router();
const { authenticateRetailer } = require('../middleware/auth');
const { generateDeviceSetupQR } = require('../controllers/retailerDeviceSetupController');

/**
 * Retailer Device Setup Routes
 * For retailers to generate QR codes during device sales
 */

// POST /api/retailer/device-setup/qr/:customerId - Generate QR for device provisioning
router.post('/qr/:customerId', authenticateRetailer, generateDeviceSetupQR);

module.exports = router;
