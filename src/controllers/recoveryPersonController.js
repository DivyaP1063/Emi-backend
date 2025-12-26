const { body, validationResult } = require('express-validator');
const RecoveryPerson = require('../models/RecoveryPerson');

/**
 * Validation rules for create recovery person
 */
const createRecoveryPersonValidation = [
    body('fullName')
        .trim()
        .notEmpty()
        .withMessage('Full name is required'),
    body('aadharNumber')
        .trim()
        .matches(/^[0-9]{12}$/)
        .withMessage('Aadhar number must be exactly 12 digits'),
    body('mobileNumber')
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Mobile number must be exactly 10 digits')
];

/**
 * Create recovery person (Recovery Head only)
 */
const createRecoveryPerson = async (req, res) => {
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

        const { fullName, aadharNumber, mobileNumber } = req.body;
        const recoveryHeadId = req.recoveryHead.id; // From authenticateRecoveryHead middleware

        // Check if aadhar already exists
        const existingAadhar = await RecoveryPerson.findOne({ aadharNumber });
        if (existingAadhar) {
            return res.status(400).json({
                success: false,
                message: 'Recovery person with this Aadhar number already exists',
                error: 'DUPLICATE_AADHAR'
            });
        }

        // Check if mobile already exists
        const existingMobile = await RecoveryPerson.findOne({ mobileNumber });
        if (existingMobile) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number already registered',
                error: 'DUPLICATE_MOBILE'
            });
        }

        // Create recovery person
        const recoveryPerson = await RecoveryPerson.create({
            fullName,
            aadharNumber,
            mobileNumber,
            recoveryHeadId,
            mobileVerified: true,
            isActive: true
        });

        return res.status(201).json({
            success: true,
            message: 'Recovery person created successfully',
            data: {
                recoveryPersonId: recoveryPerson._id.toString(),
                fullName: recoveryPerson.fullName,
                aadharNumber: recoveryPerson.aadharNumber,
                mobileNumber: recoveryPerson.mobileNumber,
                mobileVerified: recoveryPerson.mobileVerified,
                isActive: recoveryPerson.isActive,
                recoveryHeadId: recoveryPerson.recoveryHeadId.toString(),
                createdAt: recoveryPerson.createdAt
            }
        });
    } catch (error) {
        console.error('Create recovery person error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create recovery person',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all recovery persons for authenticated recovery head
 */
const getAllRecoveryPersons = async (req, res) => {
    try {
        const recoveryHeadId = req.recoveryHead.id;
        const { page = 1, limit = 20, search = '' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build search query
        let searchQuery = { recoveryHeadId };
        if (search) {
            searchQuery = {
                recoveryHeadId,
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { mobileNumber: { $regex: search, $options: 'i' } },
                    { aadharNumber: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Get total count
        const totalRecoveryPersons = await RecoveryPerson.countDocuments(searchQuery);

        // Fetch recovery persons with pagination
        const recoveryPersons = await RecoveryPerson.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const totalPages = Math.ceil(totalRecoveryPersons / limitNum);

        return res.status(200).json({
            success: true,
            message: 'Recovery persons fetched successfully',
            data: {
                recoveryPersons: recoveryPersons.map(rp => ({
                    id: rp._id.toString(),
                    fullName: rp.fullName,
                    aadharNumber: rp.aadharNumber,
                    mobileNumber: rp.mobileNumber,
                    mobileVerified: rp.mobileVerified,
                    isActive: rp.isActive,
                    createdAt: rp.createdAt,
                    updatedAt: rp.updatedAt
                })),
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems: totalRecoveryPersons,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });
    } catch (error) {
        console.error('Get all recovery persons error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch recovery persons',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Update recovery person status (Recovery Head only)
 */
const updateRecoveryPersonStatus = async (req, res) => {
    try {
        const { recoveryPersonId } = req.params;
        const { isActive } = req.body;
        const recoveryHeadId = req.recoveryHead.id;

        // Validate required fields
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive status is required and must be a boolean',
                error: 'VALIDATION_ERROR'
            });
        }

        // Validate recovery person ID format
        if (!recoveryPersonId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recovery person ID format',
                error: 'VALIDATION_ERROR'
            });
        }

        // Find recovery person and verify ownership
        const recoveryPerson = await RecoveryPerson.findOne({
            _id: recoveryPersonId,
            recoveryHeadId
        });

        if (!recoveryPerson) {
            return res.status(404).json({
                success: false,
                message: 'Recovery person not found or not authorized',
                error: 'RECOVERY_PERSON_NOT_FOUND'
            });
        }

        // Update status
        const previousStatus = recoveryPerson.isActive;
        recoveryPerson.isActive = isActive;
        await recoveryPerson.save();

        return res.status(200).json({
            success: true,
            message: `Recovery person ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                recoveryPersonId: recoveryPerson._id.toString(),
                fullName: recoveryPerson.fullName,
                previousStatus,
                currentStatus: recoveryPerson.isActive,
                updatedAt: recoveryPerson.updatedAt
            }
        });
    } catch (error) {
        console.error('Update recovery person status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update recovery person status',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Validation rules for collect device
 */
const collectDeviceValidation = [
    body('customerId')
        .trim()
        .notEmpty()
        .withMessage('Customer ID is required')
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid customer ID format'),
    body('deviceFrontImage')
        .trim()
        .notEmpty()
        .withMessage('Device front image is required')
        .isURL()
        .withMessage('Device front image must be a valid URL'),
    body('deviceBackImage')
        .trim()
        .notEmpty()
        .withMessage('Device back image is required')
        .isURL()
        .withMessage('Device back image must be a valid URL'),
    body('devicePin')
        .trim()
        .notEmpty()
        .withMessage('Device PIN is required'),
    body('paymentDeadline')
        .trim()
        .notEmpty()
        .withMessage('Payment deadline is required')
        .isISO8601()
        .withMessage('Payment deadline must be a valid date'),
    body('notes')
        .optional()
        .trim()
];

/**
 * Collect device from customer
 * Recovery Person only - requires authentication
 */
const collectDevice = async (req, res) => {
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

        const recoveryPersonId = req.recoveryPerson.id;
        const { customerId, deviceFrontImage, deviceBackImage, devicePin, paymentDeadline, notes } = req.body;

        const Customer = require('../models/Customer');
        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Verify customer is assigned to this recovery person
        const assignment = await RecoveryHeadAssignment.findOne({
            customerId: customerId,
            recoveryPersonId: recoveryPersonId,
            status: 'ACTIVE'
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found or not assigned to you',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        // Get customer
        const customer = await Customer.findById(customerId);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        // Check if device is already collected
        if (customer.isCollected) {
            return res.status(409).json({
                success: false,
                message: 'Device has already been collected',
                error: 'DEVICE_ALREADY_COLLECTED',
                data: {
                    collectedAt: customer.collectedAt,
                    collectedBy: customer.deviceCollection.collectedByName
                }
            });
        }

        // Get recovery person details
        const recoveryPerson = await RecoveryPerson.findById(recoveryPersonId);

        // Update customer with device collection details
        customer.isCollected = true;
        customer.collectedAt = new Date();
        customer.deviceCollection = {
            deviceFrontImage,
            deviceBackImage,
            devicePin,
            paymentDeadline: new Date(paymentDeadline),
            collectedBy: recoveryPersonId,
            collectedByName: recoveryPerson.fullName,
            notes: notes || null
        };

        await customer.save();

        return res.status(200).json({
            success: true,
            message: 'Device collected successfully',
            data: {
                customerId: customer._id.toString(),
                customerName: customer.fullName,
                isCollected: customer.isCollected,
                collectedAt: customer.collectedAt,
                deviceCollection: {
                    deviceFrontImage: customer.deviceCollection.deviceFrontImage,
                    deviceBackImage: customer.deviceCollection.deviceBackImage,
                    devicePin: customer.deviceCollection.devicePin,
                    paymentDeadline: customer.deviceCollection.paymentDeadline,
                    collectedBy: customer.deviceCollection.collectedBy.toString(),
                    collectedByName: customer.deviceCollection.collectedByName,
                    notes: customer.deviceCollection.notes
                }
            }
        });

    } catch (error) {
        console.error('Collect device error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to collect device',
            error: 'SERVER_ERROR'
        });
    }
};


/**
 * Get all customers assigned to the authenticated recovery person
 */
const getAssignedCustomers = async (req, res) => {
    try {
        const recoveryPersonId = req.recoveryPerson.id;
        const { page = 1, limit = 20, search = '' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const Customer = require('../models/Customer');
        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Get all active assignments for this recovery person
        const assignments = await RecoveryHeadAssignment.find({
            recoveryPersonId,
            status: 'ACTIVE'
        }).select('customerId');

        const customerIds = assignments.map(a => a.customerId);

        // Build search query
        let searchQuery = { _id: { $in: customerIds } };
        if (search) {
            searchQuery = {
                _id: { $in: customerIds },
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { mobileNumber: { $regex: search, $options: 'i' } },
                    { aadharNumber: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Get total count
        const totalCustomers = await Customer.countDocuments(searchQuery);

        // Fetch customers with pagination
        const customers = await Customer.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const totalPages = Math.ceil(totalCustomers / limitNum);

        return res.status(200).json({
            success: true,
            message: 'Customers fetched successfully',
            data: {
                customers: customers.map(customer => ({
                    id: customer._id.toString(),
                    fullName: customer.fullName,
                    mobileNumber: customer.mobileNumber,
                    aadharNumber: customer.aadharNumber,
                    address: {
                        village: customer.address.village,
                        nearbyLocation: customer.address.nearbyLocation,
                        post: customer.address.post,
                        district: customer.address.district,
                        pincode: customer.address.pincode
                    },
                    imei: customer.imei1,
                    productName: customer.emiDetails.productName,
                    model: customer.emiDetails.model,
                    isCollected: customer.isCollected,
                    collectedAt: customer.collectedAt
                })),
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems: totalCustomers,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });
    } catch (error) {
        console.error('Get assigned customers error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch customers',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get dashboard statistics for the authenticated recovery person
 */
const getDashboardStats = async (req, res) => {
    try {
        const recoveryPersonId = req.recoveryPerson.id;

        const Customer = require('../models/Customer');
        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Get all active assignments for this recovery person
        const assignments = await RecoveryHeadAssignment.find({
            recoveryPersonId,
            status: 'ACTIVE'
        }).select('customerId');

        const customerIds = assignments.map(a => a.customerId);

        // Count total assigned customers
        const totalAssigned = customerIds.length;

        // Count collected customers
        const totalCollected = await Customer.countDocuments({
            _id: { $in: customerIds },
            isCollected: true
        });

        return res.status(200).json({
            success: true,
            message: 'Dashboard statistics fetched successfully',
            data: {
                totalAssigned,
                totalCollected
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: 'SERVER_ERROR'
        });
    }
};


module.exports = {
    createRecoveryPerson,
    getAllRecoveryPersons,
    updateRecoveryPersonStatus,
    createRecoveryPersonValidation,
    collectDevice,
    collectDeviceValidation,
    getAssignedCustomers,
    getDashboardStats
};
