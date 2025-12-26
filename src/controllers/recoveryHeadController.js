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

/**
 * Validation rules for bulk assign customers to recovery person
 */
const assignCustomersToRecoveryPersonValidation = [
    body('recoveryPersonId')
        .trim()
        .notEmpty()
        .withMessage('Recovery person ID is required')
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid recovery person ID format'),
    body('customerIds')
        .isArray({ min: 1 })
        .withMessage('Customer IDs must be an array with at least one customer'),
    body('customerIds.*')
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Each customer ID must be a valid MongoDB ObjectId')
];

/**
 * Get all unassigned customers (assigned to recovery head but not to any recovery person)
 * Recovery Head only - requires authentication
 */
const getUnassignedCustomers = async (req, res) => {
    try {
        const recoveryHeadId = req.recoveryHead.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';

        const skip = (page - 1) * limit;

        const Customer = require('../models/Customer');
        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Get all customer IDs that are actively assigned to recovery persons
        const assignedCustomerIds = await RecoveryHeadAssignment.find({
            recoveryHeadId: recoveryHeadId,
            status: 'ACTIVE'
        }).distinct('customerId');

        // Build query for customers assigned to recovery head but not to recovery person
        let query = {
            assignedToRecoveryHeadId: recoveryHeadId,
            assigned: true,
            _id: { $nin: assignedCustomerIds } // Not in assigned customers list
        };

        // Add search filter
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { mobileNumber: { $regex: search, $options: 'i' } },
                { imei1: { $regex: search, $options: 'i' } }
            ];
        }

        // Get total count
        const totalItems = await Customer.countDocuments(query);

        // Get customers
        const customers = await Customer.find(query)
            .select('fullName mobileNumber address.pincode emiDetails.balanceAmount emiDetails.emiPerMonth isLocked assignedAt')
            .skip(skip)
            .limit(limit)
            .sort({ assignedAt: -1 });

        const totalPages = Math.ceil(totalItems / limit);

        // Format customer data
        const formattedCustomers = customers.map(customer => ({
            customerId: customer._id.toString(),
            fullName: customer.fullName,
            mobileNumber: customer.mobileNumber,
            pincode: customer.address.pincode,
            balanceAmount: customer.emiDetails.balanceAmount,
            emiPerMonth: customer.emiDetails.emiPerMonth,
            isLocked: customer.isLocked,
            assignedAt: customer.assignedAt
        }));

        return res.status(200).json({
            success: true,
            message: 'Unassigned customers fetched successfully',
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
        console.error('Get unassigned customers error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch unassigned customers',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Bulk assign multiple customers to a recovery person
 * Recovery Head only - requires authentication
 */
const assignCustomersToRecoveryPerson = async (req, res) => {
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

        const recoveryHeadId = req.recoveryHead.id;
        const { recoveryPersonId, customerIds } = req.body;

        const RecoveryPerson = require('../models/RecoveryPerson');
        const Customer = require('../models/Customer');
        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Verify recovery person belongs to this recovery head
        const recoveryPerson = await RecoveryPerson.findOne({
            _id: recoveryPersonId,
            recoveryHeadId: recoveryHeadId,
            isActive: true
        });

        if (!recoveryPerson) {
            return res.status(404).json({
                success: false,
                message: 'Recovery person not found or does not belong to you',
                error: 'RECOVERY_PERSON_NOT_FOUND'
            });
        }

        // Get recovery head details
        const recoveryHead = await RecoveryHead.findById(recoveryHeadId);

        // Verify all customers are assigned to this recovery head
        const customers = await Customer.find({
            _id: { $in: customerIds },
            assignedToRecoveryHeadId: recoveryHeadId,
            assigned: true
        });

        if (customers.length !== customerIds.length) {
            return res.status(404).json({
                success: false,
                message: 'Some customers not found or not assigned to you',
                error: 'CUSTOMER_NOT_FOUND'
            });
        }

        // Check if any customer is already assigned to a recovery person
        const existingAssignments = await RecoveryHeadAssignment.find({
            customerId: { $in: customerIds },
            status: 'ACTIVE'
        });

        if (existingAssignments.length > 0) {
            const alreadyAssignedCustomers = existingAssignments.map(assignment => ({
                customerId: assignment.customerId.toString(),
                customerName: assignment.customerName,
                recoveryPersonId: assignment.recoveryPersonId.toString(),
                recoveryPersonName: assignment.recoveryPersonName
            }));

            return res.status(409).json({
                success: false,
                message: 'Some customers are already assigned to recovery persons',
                error: 'CUSTOMERS_ALREADY_ASSIGNED',
                data: {
                    alreadyAssignedCustomers
                }
            });
        }

        // Create assignments for all customers
        const assignmentsToCreate = customers.map(customer => ({
            recoveryHeadId: recoveryHeadId,
            recoveryHeadName: recoveryHead.fullName,
            recoveryPersonId: recoveryPersonId,
            recoveryPersonName: recoveryPerson.fullName,
            customerId: customer._id,
            customerName: customer.fullName,
            status: 'ACTIVE'
        }));

        const createdAssignments = await RecoveryHeadAssignment.insertMany(assignmentsToCreate);

        // Add all customers to recovery person's customers array
        const newCustomerIds = customerIds.filter(id => !recoveryPerson.customers.includes(id));
        if (newCustomerIds.length > 0) {
            recoveryPerson.customers.push(...newCustomerIds);
            await recoveryPerson.save();
        }

        return res.status(201).json({
            success: true,
            message: `${customers.length} customer(s) assigned to recovery person successfully`,
            data: {
                recoveryPersonId: recoveryPerson._id.toString(),
                recoveryPersonName: recoveryPerson.fullName,
                assignedCount: createdAssignments.length,
                assignments: createdAssignments.map(assignment => ({
                    assignmentId: assignment._id.toString(),
                    customerId: assignment.customerId.toString(),
                    customerName: assignment.customerName,
                    assignedAt: assignment.assignedAt
                }))
            }
        });

    } catch (error) {
        console.error('Assign customers to recovery person error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to assign customers to recovery person',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all recovery persons with their assigned customers
 * Recovery Head only - requires authentication
 */
const getRecoveryPersonsWithCustomers = async (req, res) => {
    try {
        const recoveryHeadId = req.recoveryHead.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';

        const skip = (page - 1) * limit;

        const RecoveryPerson = require('../models/RecoveryPerson');

        // Build query
        let query = {
            recoveryHeadId: recoveryHeadId
        };

        // Add search filter
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { mobileNumber: { $regex: search, $options: 'i' } }
            ];
        }

        // Get total count
        const totalItems = await RecoveryPerson.countDocuments(query);

        // Get recovery persons with populated customers
        const recoveryPersons = await RecoveryPerson.find(query)
            .populate({
                path: 'customers',
                select: 'fullName mobileNumber address.pincode emiDetails.balanceAmount isLocked isCollected'
            })
            .select('fullName mobileNumber aadharNumber isActive customers')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalPages = Math.ceil(totalItems / limit);

        // Format response
        const formattedRecoveryPersons = recoveryPersons.map(rp => {
            const totalCustomers = rp.customers.length;
            const collectedCustomers = rp.customers.filter(c => c.isCollected).length;
            const isRecoveryTaskDone = totalCustomers > 0 && totalCustomers === collectedCustomers;

            return {
                recoveryPersonId: rp._id.toString(),
                fullName: rp.fullName,
                mobileNumber: rp.mobileNumber,
                aadharNumber: rp.aadharNumber,
                isActive: rp.isActive,
                customersCount: totalCustomers,
                collectedCount: collectedCustomers,
                isRecoveryTaskDone: isRecoveryTaskDone,
                customers: rp.customers.map(customer => ({
                    customerId: customer._id.toString(),
                    fullName: customer.fullName,
                    mobileNumber: customer.mobileNumber,
                    pincode: customer.address.pincode,
                    balanceAmount: customer.emiDetails.balanceAmount,
                    isLocked: customer.isLocked,
                    isCollected: customer.isCollected
                }))
            };
        });

        return res.status(200).json({
            success: true,
            message: 'Recovery persons with customers fetched successfully',
            data: {
                recoveryPersons: formattedRecoveryPersons,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit
                }
            }
        });

    } catch (error) {
        console.error('Get recovery persons with customers error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch recovery persons with customers',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get assignment details by assignment ID
 * Recovery Head only - requires authentication
 */
const getAssignmentDetails = async (req, res) => {
    try {
        const recoveryHeadId = req.recoveryHead.id;
        const { assignmentId } = req.params;

        // Validate assignmentId format
        if (!assignmentId || !assignmentId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid assignment ID format',
                error: 'VALIDATION_ERROR'
            });
        }

        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Find assignment and verify ownership
        const assignment = await RecoveryHeadAssignment.findOne({
            _id: assignmentId,
            recoveryHeadId: recoveryHeadId
        })
            .populate('recoveryPersonId', 'fullName mobileNumber aadharNumber isActive')
            .populate('customerId', 'fullName mobileNumber address emiDetails.balanceAmount isLocked')
            .lean();

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found or does not belong to you',
                error: 'ASSIGNMENT_NOT_FOUND'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Assignment details fetched successfully',
            data: {
                assignmentId: assignment._id.toString(),
                status: assignment.status,
                recoveryPerson: assignment.recoveryPersonId ? {
                    recoveryPersonId: assignment.recoveryPersonId._id.toString(),
                    fullName: assignment.recoveryPersonId.fullName,
                    mobileNumber: assignment.recoveryPersonId.mobileNumber,
                    aadharNumber: assignment.recoveryPersonId.aadharNumber,
                    isActive: assignment.recoveryPersonId.isActive
                } : null,
                customer: assignment.customerId ? {
                    customerId: assignment.customerId._id.toString(),
                    fullName: assignment.customerId.fullName,
                    mobileNumber: assignment.customerId.mobileNumber,
                    address: assignment.customerId.address,
                    balanceAmount: assignment.customerId.emiDetails.balanceAmount,
                    isLocked: assignment.customerId.isLocked
                } : null,
                assignedAt: assignment.assignedAt,
                unassignedAt: assignment.unassignedAt
            }
        });

    } catch (error) {
        console.error('Get assignment details error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch assignment details',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Unassign a customer from a recovery person
 * Recovery Head only - requires authentication
 */
const unassignCustomerFromRecoveryPerson = async (req, res) => {
    try {
        const recoveryHeadId = req.recoveryHead.id;
        const { assignmentId } = req.params;

        // Validate assignmentId format
        if (!assignmentId || !assignmentId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid assignment ID format',
                error: 'VALIDATION_ERROR'
            });
        }

        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');
        const RecoveryPerson = require('../models/RecoveryPerson');

        // Find assignment and verify ownership
        const assignment = await RecoveryHeadAssignment.findOne({
            _id: assignmentId,
            recoveryHeadId: recoveryHeadId,
            status: 'ACTIVE'
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Active assignment not found or does not belong to you',
                error: 'ASSIGNMENT_NOT_FOUND'
            });
        }

        // Update assignment status
        assignment.status = 'INACTIVE';
        assignment.unassignedAt = new Date();
        await assignment.save();

        // Remove customer from recovery person's customers array
        await RecoveryPerson.findByIdAndUpdate(
            assignment.recoveryPersonId,
            { $pull: { customers: assignment.customerId } }
        );

        return res.status(200).json({
            success: true,
            message: 'Customer unassigned from recovery person successfully',
            data: {
                assignmentId: assignment._id.toString(),
                recoveryPersonId: assignment.recoveryPersonId.toString(),
                recoveryPersonName: assignment.recoveryPersonName,
                customerId: assignment.customerId.toString(),
                customerName: assignment.customerName,
                unassignedAt: assignment.unassignedAt
            }
        });

    } catch (error) {
        console.error('Unassign customer from recovery person error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to unassign customer from recovery person',
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
    getCustomerLocationByRecoveryHead,
    getUnassignedCustomers,
    assignCustomersToRecoveryPerson,
    assignCustomersToRecoveryPersonValidation,
    getRecoveryPersonsWithCustomers,
    getAssignmentDetails,
    unassignCustomerFromRecoveryPerson
};
