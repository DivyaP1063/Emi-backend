const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');

/**
 * Validation rules for updating FCM token
 */
const updateFcmTokenValidation = [
    body('fcmToken')
        .trim()
        .notEmpty()
        .withMessage('FCM token is required'),
    body('imei1')
        .trim()
        .matches(/^[0-9]{15}$/)
        .withMessage('IMEI1 must be exactly 15 digits')
];

/**
 * Update Customer FCM Token
 * Called by mobile app to register/update FCM token
 */
const updateCustomerFcmToken = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const { fcmToken, imei1 } = req.body;

        // Find customer by IMEI1
        const customer = await Customer.findOne({ imei1 });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found with this IMEI',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        // Update FCM token
        customer.fcmToken = fcmToken;
        await customer.save();

        console.log(`✅ FCM token updated for customer: ${customer.fullName} (${imei1})`);

        return res.status(200).json({
            success: true,
            message: 'FCM token registered successfully',
            data: {
                customerId: customer._id.toString(),
                customerName: customer.fullName,
                isLocked: customer.isLocked,
                updatedAt: customer.updatedAt
            }
        });
    } catch (error) {
        console.error('Update FCM token error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update FCM token',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Validation rules for lock response
 */
const lockResponseValidation = [
    body('imei1')
        .trim()
        .matches(/^[0-9]{15}$/)
        .withMessage('IMEI1 must be exactly 15 digits'),
    body('lockSuccess')
        .isBoolean()
        .withMessage('lockSuccess must be a boolean'),
    body('action')
        .isIn(['LOCK_DEVICE', 'UNLOCK_DEVICE'])
        .withMessage('action must be either LOCK_DEVICE or UNLOCK_DEVICE')
];

/**
 * Device Lock Response Callback
 * Called by mobile app after attempting to lock/unlock device
 */
const deviceLockResponse = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const { imei1, lockSuccess, action, errorMessage } = req.body;

        // Find customer by IMEI1
        const customer = await Customer.findOne({ imei1 });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found with this IMEI',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        // Log the response
        console.log(`📱 Device lock response from ${customer.fullName}:`);
        console.log(`   Action: ${action}`);
        console.log(`   Success: ${lockSuccess}`);
        if (errorMessage) {
            console.log(`   Error: ${errorMessage}`);
        }

        // If device lock/unlock was successful, confirm the status in database
        if (lockSuccess) {
            const shouldBeLocked = action === 'LOCK_DEVICE';

            // Only update if the status doesn't match
            if (customer.isLocked !== shouldBeLocked) {
                customer.isLocked = shouldBeLocked;
                await customer.save();
                console.log(`✅ Customer lock status confirmed: ${shouldBeLocked}`);
            }
        } else {
            // Device failed to lock/unlock
            console.warn(`⚠️  Device failed to ${action}: ${errorMessage || 'Unknown error'}`);

            // You might want to notify admin or retry
            // For now, we just log it
        }

        return res.status(200).json({
            success: true,
            message: 'Lock response received',
            data: {
                customerId: customer._id.toString(),
                customerName: customer.fullName,
                currentLockStatus: customer.isLocked,
                responseProcessed: true
            }
        });
    } catch (error) {
        console.error('Device lock response error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process lock response',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get Customer Status by IMEI
 * Called by mobile app to check current lock status
 */
const getCustomerStatus = async (req, res) => {
    try {
        const { imei1 } = req.params;

        // Validate IMEI format
        if (!imei1 || !imei1.match(/^[0-9]{15}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid IMEI format. Must be exactly 15 digits',
                error: 'VALIDATION_ERROR'
            });
        }

        // Find customer by IMEI1
        const customer = await Customer.findOne({ imei1 })
            .select('fullName mobileNumber isLocked emiDetails.emiMonths createdAt updatedAt')
            .lean();

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found with this IMEI',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        // Calculate pending EMIs
        const currentDate = new Date();
        const pendingEmis = customer.emiDetails.emiMonths.filter(
            emi => !emi.paid && new Date(emi.dueDate) < currentDate
        );

        return res.status(200).json({
            success: true,
            message: 'Customer status fetched successfully',
            data: {
                customerId: customer._id.toString(),
                customerName: customer.fullName,
                mobileNumber: customer.mobileNumber,
                isLocked: customer.isLocked,
                hasPendingEmis: pendingEmis.length > 0,
                pendingEmiCount: pendingEmis.length,
                registeredAt: customer.createdAt,
                lastUpdated: customer.updatedAt
            }
        });
    } catch (error) {
        console.error('Get customer status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch customer status',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    updateCustomerFcmToken,
    updateFcmTokenValidation,
    deviceLockResponse,
    lockResponseValidation,
    getCustomerStatus
};
