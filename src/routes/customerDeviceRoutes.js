const express = require('express');
const router = express.Router();
const {
    updateCustomerFcmToken,
    updateFcmTokenValidation,
    deviceLockResponse,
    lockResponseValidation,
    getCustomerStatus
} = require('../controllers/customerDeviceController');

/**
 * Customer Device Routes
 * These endpoints are called by the mobile app installed on customer devices
 */

// PUT /api/customer/device/fcm-token - Register/Update FCM token
router.put('/fcm-token', updateFcmTokenValidation, updateCustomerFcmToken);

// POST /api/customer/device/lock-response - Device lock/unlock response callback
router.post('/lock-response', lockResponseValidation, deviceLockResponse);

// GET /api/customer/device/status/:imei1 - Get customer status by IMEI
router.get('/status/:imei1', getCustomerStatus);

module.exports = router;
