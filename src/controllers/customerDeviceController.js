const { body, validationResult } = require('express-validator');
const Customer = require('../models/Customer');

/**
 * Validation rules for updating FCM token
 * Supports optional PIN and location for complete device registration
 */
const updateFcmTokenValidation = [
    body('fcmToken')
        .trim()
        .notEmpty()
        .withMessage('FCM token is required'),
    body('imei1')
        .trim()
        .matches(/^[0-9]{15}$/)
        .withMessage('IMEI1 must be exactly 15 digits'),
    body('devicePin')
        .optional()
        .trim()
        .matches(/^[0-9]{4,6}$/)
        .withMessage('Device PIN must be 4-6 digits'),
    body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180')
];


/**
 * Register Device with Complete Information
 * Called by Kotlin app when first installed
 */
const registerDevice = async (req, res) => {
    try {
        console.log('\n📱 ===== DEVICE REGISTRATION REQUEST =====');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Request Body:', JSON.stringify(req.body, null, 2));

        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation failed:', errors.array());
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const { fcmToken, imei1, devicePin, latitude, longitude } = req.body;

        console.log('IMEI1:', imei1);
        console.log('Device PIN:', devicePin);
        console.log('Location:', { latitude, longitude });
        console.log('Searching for customer with IMEI:', imei1);

        // Find customer by IMEI1
        const customer = await Customer.findOne({ imei1 });

        if (!customer) {
            console.log('❌ Customer not found with IMEI:', imei1);
            return res.status(404).json({
                success: false,
                message: 'Customer not found with this IMEI',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        console.log('✅ Customer found:', customer.fullName);
        console.log('Customer ID:', customer._id.toString());

        // Update device information
        customer.fcmToken = fcmToken;
        customer.devicePin = devicePin;
        customer.location = {
            latitude,
            longitude,
            lastUpdated: new Date()
        };

        await customer.save();

        console.log('✅ Device registered successfully');
        console.log('Customer:', customer.fullName);
        console.log('IMEI:', imei1);
        console.log('Lock Status:', customer.isLocked ? 'LOCKED' : 'UNLOCKED');
        console.log('Location Updated:', customer.location.lastUpdated);
        console.log('=========================================\n');

        return res.status(200).json({
            success: true,
            message: 'Device registered successfully',
            data: {
                customerId: customer._id.toString(),
                customerName: customer.fullName,
                isLocked: customer.isLocked,
                location: {
                    latitude: customer.location.latitude,
                    longitude: customer.location.longitude,
                    lastUpdated: customer.location.lastUpdated
                },
                updatedAt: customer.updatedAt
            }
        });
    } catch (error) {
        console.error('❌ Device registration error:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            success: false,
            message: 'Failed to register device',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Update Customer FCM Token
 * Called by mobile app to register/update FCM token
 */
const updateCustomerFcmToken = async (req, res) => {
    try {
        console.log('\n📱 ===== FCM TOKEN REGISTRATION REQUEST =====');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Request Body:', JSON.stringify(req.body, null, 2));

        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation failed:', errors.array());
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const { fcmToken, imei1, devicePin, latitude, longitude } = req.body;

        console.log('FCM Token (first 20 chars):', fcmToken.substring(0, 20) + '...');
        console.log('IMEI1:', imei1);
        if (devicePin) console.log('Device PIN:', devicePin);
        if (latitude && longitude) console.log('Location:', { latitude, longitude });
        console.log('Searching for customer with IMEI:', imei1);

        // Find customer by IMEI1
        const customer = await Customer.findOne({ imei1 });

        if (!customer) {
            console.log('❌ Customer not found with IMEI:', imei1);
            return res.status(404).json({
                success: false,
                message: 'Customer not found with this IMEI',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        console.log('✅ Customer found:', customer.fullName);
        console.log('Customer ID:', customer._id.toString());
        console.log('Previous FCM Token:', customer.fcmToken ? 'Exists' : 'None');

        // Update FCM token
        customer.fcmToken = fcmToken;

        // Update device PIN if provided
        if (devicePin) {
            customer.devicePin = devicePin;
            console.log('Device PIN updated');
        }

        // Update location if provided
        if (latitude !== undefined && longitude !== undefined) {
            customer.location = {
                latitude,
                longitude,
                lastUpdated: new Date()
            };
            console.log('Location updated');
        }

        await customer.save();

        console.log('✅ FCM token updated successfully');
        console.log('Customer:', customer.fullName);
        console.log('IMEI:', imei1);
        console.log('Lock Status:', customer.isLocked ? 'LOCKED' : 'UNLOCKED');
        console.log('=========================================\n');

        const responseData = {
            customerId: customer._id.toString(),
            customerName: customer.fullName,
            isLocked: customer.isLocked,
            updatedAt: customer.updatedAt
        };

        // Include location in response if it exists
        if (customer.location && customer.location.latitude && customer.location.longitude) {
            responseData.location = {
                latitude: customer.location.latitude,
                longitude: customer.location.longitude,
                lastUpdated: customer.location.lastUpdated
            };
        }

        return res.status(200).json({
            success: true,
            message: 'FCM token registered successfully',
            data: responseData
        });
    } catch (error) {
        console.error('❌ Update FCM token error:', error);
        console.error('Error stack:', error.stack);
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
        console.log('\n📲 ===== DEVICE LOCK RESPONSE RECEIVED =====');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Request Body:', JSON.stringify(req.body, null, 2));

        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation failed:', errors.array());
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const { imei1, lockSuccess, action, errorMessage } = req.body;

        console.log('IMEI:', imei1);
        console.log('Action:', action);
        console.log('Success:', lockSuccess);
        if (errorMessage) {
            console.log('Error Message:', errorMessage);
        }

        // Find customer by IMEI1
        const customer = await Customer.findOne({ imei1 });

        if (!customer) {
            console.log('❌ Customer not found with IMEI:', imei1);
            return res.status(404).json({
                success: false,
                message: 'Customer not found with this IMEI',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        console.log('✅ Customer found:', customer.fullName);
        console.log('Current DB Lock Status:', customer.isLocked);

        // If device lock/unlock was successful, confirm the status in database
        if (lockSuccess) {
            const shouldBeLocked = action === 'LOCK_DEVICE';

            console.log('Device reports successful', action);
            console.log('Should be locked:', shouldBeLocked);

            // Only update if the status doesn't match
            if (customer.isLocked !== shouldBeLocked) {
                const previousStatus = customer.isLocked;
                customer.isLocked = shouldBeLocked;
                await customer.save();

                console.log('✅ DATABASE UPDATED');
                console.log('Previous Status:', previousStatus);
                console.log('New Status:', customer.isLocked);
                console.log(`🔒 Customer ${customer.fullName} is now ${shouldBeLocked ? 'LOCKED' : 'UNLOCKED'}`);
            } else {
                console.log('ℹ️  Status already matches - no update needed');
            }
        } else {
            // Device failed to lock/unlock
            console.warn(`⚠️  DEVICE LOCK FAILED`);
            console.warn(`Customer: ${customer.fullName}`);
            console.warn(`Action: ${action}`);
            console.warn(`Error: ${errorMessage || 'Unknown error'}`);
            console.warn(`Database lock status NOT updated`);
        }

        console.log('Final DB Lock Status:', customer.isLocked);
        console.log('=========================================\n');

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
        console.error('❌ Device lock response error:', error);
        console.error('Error stack:', error.stack);
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

/**
 * Validation rules for location update
 */
const updateLocationValidation = [
    body('imei1')
        .trim()
        .matches(/^[0-9]{15}$/)
        .withMessage('IMEI1 must be exactly 15 digits'),
    body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180')
];

/**
 * Get Customer Location by IMEI
 * Fetch current location of customer device
 */
const getCustomerLocation = async (req, res) => {
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
            .select('fullName mobileNumber location')
            .lean();

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found with this IMEI',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        // Check if location data exists
        if (!customer.location || !customer.location.latitude || !customer.location.longitude) {
            return res.status(404).json({
                success: false,
                message: 'Location data not available for this customer',
                error: 'LOCATION_NOT_FOUND'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Customer location fetched successfully',
            data: {
                customerId: customer._id.toString(),
                customerName: customer.fullName,
                mobileNumber: customer.mobileNumber,
                location: {
                    latitude: customer.location.latitude,
                    longitude: customer.location.longitude,
                    lastUpdated: customer.location.lastUpdated
                }
            }
        });
    } catch (error) {
        console.error('Get customer location error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch customer location',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Update Customer Location
 * Called by Kotlin app every 15 minutes to update device location
 */
const updateCustomerLocation = async (req, res) => {
    try {
        console.log('\n📍 ===== LOCATION UPDATE REQUEST =====');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Request Body:', JSON.stringify(req.body, null, 2));

        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation failed:', errors.array());
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const { imei1, latitude, longitude } = req.body;

        console.log('IMEI1:', imei1);
        console.log('New Location:', { latitude, longitude });

        // Find customer by IMEI1
        const customer = await Customer.findOne({ imei1 });

        if (!customer) {
            console.log('❌ Customer not found with IMEI:', imei1);
            return res.status(404).json({
                success: false,
                message: 'Customer not found with this IMEI',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        console.log('✅ Customer found:', customer.fullName);
        console.log('Previous Location:', customer.location);

        // Update location
        customer.location = {
            latitude,
            longitude,
            lastUpdated: new Date()
        };

        await customer.save();

        console.log('✅ Location updated successfully');
        console.log('Customer:', customer.fullName);
        console.log('New Location:', customer.location);
        console.log('=========================================\n');

        return res.status(200).json({
            success: true,
            message: 'Location updated successfully',
            data: {
                customerId: customer._id.toString(),
                customerName: customer.fullName,
                location: {
                    latitude: customer.location.latitude,
                    longitude: customer.location.longitude,
                    lastUpdated: customer.location.lastUpdated
                }
            }
        });
    } catch (error) {
        console.error('❌ Update location error:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            success: false,
            message: 'Failed to update location',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    updateCustomerFcmToken,
    updateFcmTokenValidation,
    deviceLockResponse,
    lockResponseValidation,
    getCustomerStatus,
    getCustomerLocation,
    updateCustomerLocation,
    updateLocationValidation
};
