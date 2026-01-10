const { body, validationResult } = require('express-validator');
const RecoveryPerson = require('../models/RecoveryPerson');
const { uploadToCloudinary } = require('../config/cloudinary');

/**
 * Validation rules for create recovery person
 */
const createRecoveryPersonValidation = [
    body('fullName')
        .trim()
        .notEmpty()
        .withMessage('Full name is required'),
    body('mobileNumber')
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Mobile number must be exactly 10 digits'),
    body('pinCodes')
        .isArray({ min: 1 })
        .withMessage('Pin codes must be an array with at least one pin code'),
    body('pinCodes.*')
        .matches(/^[0-9]{6}$/)
        .withMessage('Each pin code must be exactly 6 digits')
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

        const { fullName, mobileNumber, pinCodes } = req.body;

        // Check if mobile already exists
        const existingMobile = await RecoveryPerson.findOne({ mobileNumber });
        if (existingMobile) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number already registered',
                error: 'DUPLICATE_MOBILE'
            });
        }

        // Create recovery person (no longer tied to specific recovery head)
        const recoveryPerson = await RecoveryPerson.create({
            fullName,
            mobileNumber,
            pinCodes,
            mobileVerified: true,
            isActive: true
        });

        return res.status(201).json({
            success: true,
            message: 'Recovery person created successfully',
            data: {
                recoveryPersonId: recoveryPerson._id.toString(),
                fullName: recoveryPerson.fullName,
                mobileNumber: recoveryPerson.mobileNumber,
                pinCodes: recoveryPerson.pinCodes,
                mobileVerified: recoveryPerson.mobileVerified,
                isActive: recoveryPerson.isActive,
                assignedCustomersCount: 0,
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
        const { page = 1, limit = 20, search = '' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build search query (no longer filtered by recoveryHeadId - show all)
        let searchQuery = {};
        if (search) {
            searchQuery = {
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { mobileNumber: { $regex: search, $options: 'i' } }
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
                    mobileNumber: rp.mobileNumber,
                    pinCodes: rp.pinCodes,
                    mobileVerified: rp.mobileVerified,
                    isActive: rp.isActive,
                    assignedCustomersCount: rp.customers ? rp.customers.length : 0,
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

        // Find recovery person (no ownership check - all recovery heads can manage all recovery persons)
        const recoveryPerson = await RecoveryPerson.findById(recoveryPersonId);

        if (!recoveryPerson) {
            return res.status(404).json({
                success: false,
                message: 'Recovery person not found',
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

        // Validate files
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded',
                error: 'NO_FILES'
            });
        }

        const { deviceFrontImage, deviceBackImage } = req.files;

        if (!deviceFrontImage || !deviceBackImage) {
            return res.status(400).json({
                success: false,
                message: 'Both device front and back images are required',
                error: 'MISSING_IMAGES',
                debug: {
                    receivedFiles: Object.keys(req.files)
                }
            });
        }

        const recoveryPersonId = req.recoveryPerson.id;
        const { customerId, devicePin, paymentDeadline, notes } = req.body;

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

        // Upload images to Cloudinary
        const uploadResults = await Promise.all([
            uploadToCloudinary(deviceFrontImage[0].buffer, 'device-collection/front'),
            uploadToCloudinary(deviceBackImage[0].buffer, 'device-collection/back')
        ]);

        const [deviceFrontImageUrl, deviceBackImageUrl] = uploadResults.map(r => r.secure_url);

        // Get recovery person details
        const recoveryPerson = await RecoveryPerson.findById(recoveryPersonId);

        // Update customer with device collection details
        customer.isCollected = true;
        customer.collectedAt = new Date();
        customer.deviceCollection = {
            deviceFrontImage: deviceFrontImageUrl,
            deviceBackImage: deviceBackImageUrl,
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


/**
 * Get complete details of a specific customer
 */
const getCustomerDetails = async (req, res) => {
    try {
        const recoveryPersonId = req.recoveryPerson.id;
        const { customerId } = req.params;

        // Validate customer ID format
        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer ID format',
                error: 'VALIDATION_ERROR'
            });
        }

        const Customer = require('../models/Customer');
        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Verify customer is assigned to this recovery person
        const assignment = await RecoveryHeadAssignment.findOne({
            customerId,
            recoveryPersonId,
            status: 'ACTIVE'
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found or not assigned to you',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        // Get complete customer details
        const customer = await Customer.findById(customerId).lean();

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Customer details fetched successfully',
            data: {
                customer: {
                    id: customer._id.toString(),
                    fullName: customer.fullName,
                    fatherName: customer.fatherName,
                    mobileNumber: customer.mobileNumber,
                    aadharNumber: customer.aadharNumber,
                    dob: customer.dob,
                    address: {
                        village: customer.address.village,
                        nearbyLocation: customer.address.nearbyLocation,
                        post: customer.address.post,
                        district: customer.address.district,
                        pincode: customer.address.pincode
                    },
                    documents: {
                        customerPhoto: customer.documents.customerPhoto,
                        aadharFrontPhoto: customer.documents.aadharFrontPhoto,
                        aadharBackPhoto: customer.documents.aadharBackPhoto,
                        signaturePhoto: customer.documents.signaturePhoto
                    },
                    deviceInfo: {
                        imei1: customer.imei1,
                        imei2: customer.imei2 || null,
                        isLocked: customer.isLocked,
                        isActive: customer.isActive
                    },
                    emiDetails: {
                        branch: customer.emiDetails.branch,
                        phoneType: customer.emiDetails.phoneType,
                        model: customer.emiDetails.model,
                        productName: customer.emiDetails.productName,
                        sellPrice: customer.emiDetails.sellPrice,
                        landingPrice: customer.emiDetails.landingPrice,
                        downPayment: customer.emiDetails.downPayment,
                        downPaymentPending: customer.emiDetails.downPaymentPending,
                        emiRate: customer.emiDetails.emiRate,
                        numberOfMonths: customer.emiDetails.numberOfMonths,
                        emiPerMonth: customer.emiDetails.emiPerMonth,
                        totalEmiAmount: customer.emiDetails.totalEmiAmount,
                        balanceAmount: customer.emiDetails.balanceAmount,
                        emiMonths: customer.emiDetails.emiMonths
                    },
                    collectionInfo: {
                        isCollected: customer.isCollected,
                        collectedAt: customer.collectedAt,
                        deviceCollection: customer.deviceCollection
                    },
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt
                }
            }
        });
    } catch (error) {
        console.error('Get customer details error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch customer details',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get device location (latitude and longitude) for a specific customer
 */
const getCustomerLocation = async (req, res) => {
    try {
        const recoveryPersonId = req.recoveryPerson.id;
        const { customerId } = req.params;

        // Validate customer ID format
        if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer ID format',
                error: 'VALIDATION_ERROR'
            });
        }

        const Customer = require('../models/Customer');
        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Verify customer is assigned to this recovery person
        const assignment = await RecoveryHeadAssignment.findOne({
            customerId,
            recoveryPersonId,
            status: 'ACTIVE'
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found or not assigned to you',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        // Get customer location
        const customer = await Customer.findById(customerId).select('location fullName mobileNumber').lean();

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
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
 * Validation rules for mark payment received
 */
const markPaymentReceivedValidation = [
    body('customerId')
        .trim()
        .notEmpty()
        .withMessage('Customer ID is required')
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid customer ID format')
];

/**
 * Mark payment as received when customer pays due amount and takes back device
 * Recovery Person only - requires authentication
 */
const markPaymentReceived = async (req, res) => {
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
        const { customerId } = req.body;

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

        // Update recovery person's customers array - set moneyReceived to true
        const recoveryPerson = await RecoveryPerson.findById(recoveryPersonId);

        const customerIndex = recoveryPerson.customers.findIndex(
            c => c.customerId.toString() === customerId
        );

        if (customerIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found in your assigned list',
                error: 'CUSTOMER_NOT_IN_LIST'
            });
        }

        // Set moneyReceived to true
        recoveryPerson.customers[customerIndex].moneyReceived = true;
        await recoveryPerson.save();

        // Update customer status
        customer.assigned = false;
        customer.isCollected = false;
        await customer.save();

        // Update assignment status to INACTIVE
        assignment.status = 'INACTIVE';
        assignment.unassignedAt = new Date();
        await assignment.save();

        return res.status(200).json({
            success: true,
            message: 'Payment received and customer status updated successfully',
            data: {
                customerId: customer._id.toString(),
                customerName: customer.fullName,
                moneyReceived: true,
                customerStatus: {
                    assigned: customer.assigned,
                    isCollected: customer.isCollected
                },
                assignmentStatus: assignment.status,
                updatedAt: new Date()
            }
        });

    } catch (error) {
        console.error('Mark payment received error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to mark payment as received',
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
    getDashboardStats,
    getCustomerDetails,
    getCustomerLocation,
    markPaymentReceived,
    markPaymentReceivedValidation
};
