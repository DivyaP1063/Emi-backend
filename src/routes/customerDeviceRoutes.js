const express = require('express');
const router = express.Router();
const {
    updateCustomerFcmToken,
    updateFcmTokenValidation,
    deviceLockResponse,
    lockResponseValidation,
    getCustomerStatus,
    getCustomerLocation,
    updateCustomerLocation,
    updateLocationValidation
} = require('../controllers/customerDeviceController');

/**
 * Customer Device Routes
 * These endpoints are called by the mobile app installed on customer devices
 */

// PUT /api/customer/device/fcm-token - Register/Update FCM token (also accepts PIN and location)
router.put('/fcm-token', updateFcmTokenValidation, updateCustomerFcmToken);

// POST /api/customer/device/lock-response - Device lock/unlock response callback
router.post('/lock-response', lockResponseValidation, deviceLockResponse);

// GET /api/customer/device/status/:imei1 - Get customer status by IMEI
router.get('/status/:imei1', getCustomerStatus);

// GET /api/customer/device/location/:imei1 - Get customer location by IMEI
router.get('/location/:imei1', getCustomerLocation);

// POST /api/customer/device/location - Update customer location (called every 15 minutes)
router.post('/location', updateLocationValidation, updateCustomerLocation);

module.exports = router;
