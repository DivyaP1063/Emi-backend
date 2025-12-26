const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const {
    generateCustomerQR,
    listEnrolledDevices,
    getDeviceDetails,
    factoryResetDevice
} = require('../controllers/amapiAdminController');

/**
 * Android Management API - Admin Routes
 * All routes require admin authentication
 */

// POST /api/admin/amapi/qr/:customerId - Generate QR code for device provisioning
router.post('/qr/:customerId', authenticate, authorizeAdmin, generateCustomerQR);

// GET /api/admin/amapi/devices - List all enrolled devices
router.get('/devices', authenticate, authorizeAdmin, listEnrolledDevices);

// GET /api/admin/amapi/devices/:imei - Get device details by IMEI
router.get('/devices/:imei', authenticate, authorizeAdmin, getDeviceDetails);

// POST /api/admin/amapi/devices/:imei/factory-reset - Factory reset device (DANGEROUS)
router.post('/devices/:imei/factory-reset', authenticate, authorizeAdmin, factoryResetDevice);

module.exports = router;
