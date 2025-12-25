const { body, validationResult } = require('express-validator');
const RecoveryHead = require('../models/RecoveryHead');

/**
 * Validation rules for create recovery head
 */
const createRecoveryHeadValidation = [
    // Basic Info
    body('fullName')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 2 })
        .withMessage('Full name must be at least 2 characters'),
    body('mobileNumber')
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Mobile number must be exactly 10 digits'),

    // Pin Codes
    body('pinCodes')
        .isArray({ min: 1 })
        .withMessage('Pin codes must be an array with at least one pin code'),
    body('pinCodes.*')
        .matches(/^[0-9]{6}$/)
        .withMessage('Each pin code must be exactly 6 digits')
];

/**
 * Create new recovery head
 */
const createRecoveryHead = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorDetails = {};
            errors.array().forEach(err => {
                errorDetails[err.path] = err.msg;
            });

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: errorDetails
            });
        }

        const { fullName, mobileNumber, pinCodes } = req.body;

        // Check if mobile number already exists
        const existingMobile = await RecoveryHead.findOne({
            mobileNumber: mobileNumber
        });

        if (existingMobile) {
            return res.status(409).json({
                success: false,
                message: 'Recovery head with this mobile number already exists',
                error: 'DUPLICATE_MOBILE'
            });
        }

        // Create recovery head
        const recoveryHead = await RecoveryHead.create({
            fullName,
            mobileNumber,
            pinCodes,
            status: 'ACTIVE'
        });

        return res.status(201).json({
            success: true,
            message: 'Recovery head created successfully',
            data: {
                recoveryHeadId: recoveryHead._id.toString(),
                fullName: recoveryHead.fullName,
                mobileNumber: recoveryHead.mobileNumber,
                pinCodes: recoveryHead.pinCodes,
                status: recoveryHead.status,
                createdAt: recoveryHead.createdAt
            }
        });
    } catch (error) {
        console.error('Create recovery head error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create recovery head',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all recovery heads with pagination and filters
 */
const getAllRecoveryHeads = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const status = req.query.status;

        const skip = (page - 1) * limit;

        // Build query
        let query = {};

        // Add search filter
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { mobileNumber: { $regex: search, $options: 'i' } }
            ];
        }

        // Add status filter
        if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
            query.status = status;
        }

        // Get total count
        const totalItems = await RecoveryHead.countDocuments(query);

        // Get recovery heads
        const recoveryHeads = await RecoveryHead.find(query)
            .select('fullName mobileNumber pinCodes status createdAt')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalPages = Math.ceil(totalItems / limit);

        return res.status(200).json({
            success: true,
            message: 'Recovery heads fetched successfully',
            data: {
                recoveryHeads: recoveryHeads.map(recoveryHead => ({
                    recoveryHeadId: recoveryHead._id.toString(),
                    fullName: recoveryHead.fullName,
                    mobileNumber: recoveryHead.mobileNumber,
                    pinCodes: recoveryHead.pinCodes,
                    pinCodesCount: recoveryHead.pinCodes.length,
                    status: recoveryHead.status,
                    createdAt: recoveryHead.createdAt
                })),
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit
                }
            }
        });
    } catch (error) {
        console.error('Get recovery heads error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch recovery heads',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Validation rules for update recovery head status
 */
const updateRecoveryHeadStatusValidation = [
    body('status')
        .trim()
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['ACTIVE', 'INACTIVE'])
        .withMessage('Status must be one of: ACTIVE, INACTIVE')
];

/**
 * Update recovery head status (Admin only)
 */
const updateRecoveryHeadStatus = async (req, res) => {
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

        const { recoveryHeadId } = req.params;
        const { status } = req.body;

        // Validate recoveryHeadId format
        if (!recoveryHeadId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid recovery head ID format',
                error: 'VALIDATION_ERROR'
            });
        }

        // Find recovery head
        const recoveryHead = await RecoveryHead.findById(recoveryHeadId);

        if (!recoveryHead) {
            return res.status(404).json({
                success: false,
                message: 'Recovery head not found',
                error: 'RECOVERY_HEAD_NOT_FOUND'
            });
        }

        // Check if status is already the same
        if (recoveryHead.status === status) {
            return res.status(200).json({
                success: true,
                message: `Recovery head status is already ${status}`,
                data: {
                    recoveryHeadId: recoveryHead._id.toString(),
                    fullName: recoveryHead.fullName,
                    status: recoveryHead.status,
                    updatedAt: recoveryHead.updatedAt
                }
            });
        }

        // Update status
        const previousStatus = recoveryHead.status;
        recoveryHead.status = status;
        await recoveryHead.save();

        return res.status(200).json({
            success: true,
            message: `Recovery head status updated from ${previousStatus} to ${status}`,
            data: {
                recoveryHeadId: recoveryHead._id.toString(),
                fullName: recoveryHead.fullName,
                mobileNumber: recoveryHead.mobileNumber,
                previousStatus,
                currentStatus: recoveryHead.status,
                updatedAt: recoveryHead.updatedAt
            }
        });
    } catch (error) {
        console.error('Update recovery head status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update recovery head status',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Assign locked customers to recovery heads based on pincode matching
 * Admin only - typically called by cron job
 * Note: Skips customers that are already assigned to a recovery head
 */
const assignCustomersToRecoveryHeads = async (req, res) => {
    try {
        console.log('\n🔍 ===== RECOVERY HEAD ASSIGNMENT API CALLED =====');
        console.log('Timestamp:', new Date().toISOString());

        const Customer = require('../models/Customer');

        // Find all locked customers that are NOT yet assigned
        // This automatically skips customers who are already assigned to a recovery head
        const customersToAssign = await Customer.find({
            isLocked: true,
            assigned: false  // Only unassigned customers
        });

        console.log(`Found ${customersToAssign.length} locked customers to assign`);

        let assignedCount = 0;
        let noMatchCount = 0;
        const assignments = [];

        for (const customer of customersToAssign) {
            const customerPincode = customer.address.pincode;

            // Find active recovery head with matching pincode
            const recoveryHead = await RecoveryHead.findOne({
                status: 'ACTIVE',
                pinCodes: customerPincode
            });

            if (recoveryHead) {
                // Assign customer to recovery head
                await Customer.findByIdAndUpdate(customer._id, {
                    assigned: true,
                    assignedTo: recoveryHead.fullName,
                    assignedToRecoveryHeadId: recoveryHead._id,
                    assignedAt: new Date()
                });

                console.log(`✅ Assigned ${customer.fullName} (${customerPincode}) to ${recoveryHead.fullName}`);

                assignments.push({
                    customerId: customer._id.toString(),
                    customerName: customer.fullName,
                    pincode: customerPincode,
                    recoveryHeadId: recoveryHead._id.toString(),
                    recoveryHeadName: recoveryHead.fullName
                });

                assignedCount++;
            } else {
                console.log(`⚠️  No recovery head found for ${customer.fullName} (pincode: ${customerPincode})`);
                noMatchCount++;
            }
        }

        console.log(`\n📊 Assignment Summary: ${assignedCount} assigned, ${noMatchCount} no match`);
        console.log('=====================================\n');

        return res.status(200).json({
            success: true,
            message: 'Customer assignment completed',
            data: {
                totalCustomers: customersToAssign.length,
                assignedCount,
                noMatchCount,
                assignments
            }
        });

    } catch (error) {
        console.error('Assignment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to assign customers',
            error: error.message
        });
    }
};

/**
 * DEBUG: Get locked customers status
 * Temporary endpoint to debug assignment issues
 */
const debugLockedCustomers = async (req, res) => {
    try {
        const Customer = require('../models/Customer');

        // Get ALL customers with their lock and assignment status
        const allCustomers = await Customer.find({})
            .select('fullName isLocked assigned assignedTo address.pincode')
            .lean();

        // Get locked customers
        const lockedCustomers = await Customer.find({ isLocked: true })
            .select('fullName isLocked assigned assignedTo assignedToRecoveryHeadId address.pincode')
            .lean();

        // Get locked but not assigned
        const lockedNotAssigned = await Customer.find({
            isLocked: true,
            assigned: false
        })
            .select('fullName isLocked assigned assignedTo address.pincode')
            .lean();

        // Get all recovery heads
        const allRecoveryHeads = await RecoveryHead.find({})
            .select('fullName status pinCodes')
            .lean();

        return res.status(200).json({
            success: true,
            debug: {
                totalCustomers: allCustomers.length,
                lockedCustomers: {
                    count: lockedCustomers.length,
                    data: lockedCustomers
                },
                lockedNotAssigned: {
                    count: lockedNotAssigned.length,
                    data: lockedNotAssigned
                },
                recoveryHeads: {
                    count: allRecoveryHeads.length,
                    data: allRecoveryHeads
                },
                sampleCustomers: allCustomers.slice(0, 3) // First 3 customers to see structure
            }
        });

    } catch (error) {
        console.error('Debug error:', error);
        return res.status(500).json({
            success: false,
            message: 'Debug failed',
            error: error.message
        });
    }
};

/**
 * MIGRATION: Fix existing locked customers by adding assigned field
 * One-time migration endpoint
 */
const fixLockedCustomersAssignment = async (req, res) => {
    try {
        const Customer = require('../models/Customer');

        // Find all locked customers that don't have the assigned field
        const result = await Customer.updateMany(
            {
                isLocked: true,
                assigned: { $exists: false }
            },
            {
                $set: {
                    assigned: false,
                    assignedTo: null,
                    assignedToRecoveryHeadId: null,
                    assignedAt: null
                }
            }
        );

        console.log(`✅ Migration completed: Updated ${result.modifiedCount} customers`);

        return res.status(200).json({
            success: true,
            message: 'Migration completed successfully',
            data: {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount
            }
        });

    } catch (error) {
        console.error('Migration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Migration failed',
            error: error.message
        });
    }
};

/**
 * Get all customers assigned to the authenticated recovery head
 * Recovery Head only - requires authentication
 */
const getAssignedCustomers = async (req, res) => {
    try {
        const recoveryHeadId = req.recoveryHead.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';

        const skip = (page - 1) * limit;

        // Build query
        const query = {
            assignedToRecoveryHeadId: recoveryHeadId,
            assigned: true
        };

        // Add search filter
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { mobileNumber: { $regex: search, $options: 'i' } },
                { imei1: { $regex: search, $options: 'i' } },
                { imei2: { $regex: search, $options: 'i' } }
            ];
        }

        const Customer = require('../models/Customer');

        // Get total count
        const totalItems = await Customer.countDocuments(query);

        // Get customers
        const customers = await Customer.find(query)
            .select('fullName mobileNumber aadharNumber dob fatherName address imei1 imei2 emiDetails isLocked assignedAt documents')
            .skip(skip)
            .limit(limit)
            .sort({ assignedAt: -1 });

        const totalPages = Math.ceil(totalItems / limit);

        // Format customer data
        const formattedCustomers = customers.map(customer => {
            // Find next unpaid EMI
            const nextUnpaidEmi = customer.emiDetails.emiMonths
                .filter(emi => !emi.paid)
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

            return {
                customerId: customer._id.toString(),
                fullName: customer.fullName,
                mobileNumber: customer.mobileNumber,
                aadharNumber: customer.aadharNumber,
                dob: customer.dob,
                fatherName: customer.fatherName,
                address: {
                    village: customer.address.village,
                    nearbyLocation: customer.address.nearbyLocation,
                    post: customer.address.post,
                    district: customer.address.district,
                    pincode: customer.address.pincode
                },
                productDetails: {
                    imei1: customer.imei1,
                    imei2: customer.imei2 || null,
                    phoneType: customer.emiDetails.phoneType,
                    model: customer.emiDetails.model,
                    productName: customer.emiDetails.productName
                },
                emiInfo: {
                    nextDueDate: nextUnpaidEmi ? nextUnpaidEmi.dueDate : null,
                    nextDueAmount: nextUnpaidEmi ? nextUnpaidEmi.amount : null,
                    emiPerMonth: customer.emiDetails.emiPerMonth,
                    balanceAmount: customer.emiDetails.balanceAmount
                },
                deviceStatus: {
                    isLocked: customer.isLocked
                },
                documents: {
                    customerPhoto: customer.documents.customerPhoto,
                    aadharFrontPhoto: customer.documents.aadharFrontPhoto,
                    aadharBackPhoto: customer.documents.aadharBackPhoto,
                    signaturePhoto: customer.documents.signaturePhoto
                },
                assignedAt: customer.assignedAt
            };
        });

        return res.status(200).json({
            success: true,
            message: 'Assigned customers fetched successfully',
            data: {
                customers: formattedCustomers,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit
                }
            }
        });

    } catch (error) {
        console.error('Get assigned customers error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch assigned customers',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get customer location by recovery head
 * Recovery Head only - requires authentication
 * Only returns location for customers assigned to the authenticated recovery head
 */
const getCustomerLocationByRecoveryHead = async (req, res) => {
    try {
        const recoveryHeadId = req.recoveryHead.id;
        const { customerId } = req.params;

        // Validate customerId format
        if (!customerId || !customerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid customer ID format',
                error: 'VALIDATION_ERROR'
            });
        }

        const Customer = require('../models/Customer');

        // Find customer and verify assignment
        const customer = await Customer.findOne({
            _id: customerId,
            assignedToRecoveryHeadId: recoveryHeadId,
            assigned: true
        })
            .select('fullName mobileNumber location')
            .lean();

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found or not assigned to you',
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
        console.error('Get customer location by recovery head error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch customer location',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    createRecoveryHead,
    createRecoveryHeadValidation,
    getAllRecoveryHeads,
    updateRecoveryHeadStatus,
    updateRecoveryHeadStatusValidation,
    assignCustomersToRecoveryHeads,
    debugLockedCustomers,
    fixLockedCustomersAssignment,
    getAssignedCustomers,
    getCustomerLocationByRecoveryHead
};
