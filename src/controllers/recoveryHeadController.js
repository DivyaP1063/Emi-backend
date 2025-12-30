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
        .withMessage('Mobile number must be exactly 10 digits')
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

        const { fullName, mobileNumber } = req.body;

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
            status: 'ACTIVE'
        });

        return res.status(201).json({
            success: true,
            message: 'Recovery head created successfully',
            data: {
                recoveryHeadId: recoveryHead._id.toString(),
                fullName: recoveryHead.fullName,
                mobileNumber: recoveryHead.mobileNumber,
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
            .select('fullName mobileNumber status createdAt')
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
 * Assign locked customers to recovery persons based on pincode matching
 * Admin only - typically called by cron job
 * Implements load balancing: assigns to recovery person with least customers
 */
const assignCustomersToRecoveryPersons = async (req, res) => {
    try {
        console.log('\n🔍 ===== RECOVERY PERSON ASSIGNMENT API CALLED =====');
        console.log('Timestamp:', new Date().toISOString());

        const Customer = require('../models/Customer');
        const RecoveryPerson = require('../models/RecoveryPerson');
        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Find eligible customers: locked, not collected, 5+ days overdue, not already assigned
        const currentDate = new Date();
        const fiveDaysAgo = new Date(currentDate.getTime() - (5 * 24 * 60 * 60 * 1000));

        // Get all customer IDs that are already actively assigned
        const assignedCustomerIds = await RecoveryHeadAssignment.find({
            status: 'ACTIVE'
        }).distinct('customerId');

        // Find customers with overdue EMIs (5+ days)
        const customersToAssign = await Customer.aggregate([
            {
                $match: {
                    isLocked: true,
                    isCollected: false,
                    _id: { $nin: assignedCustomerIds } // Not already assigned
                }
            },
            {
                $addFields: {
                    overdueEmis: {
                        $filter: {
                            input: '$emiDetails.emiMonths',
                            as: 'emi',
                            cond: {
                                $and: [
                                    { $eq: ['$$emi.paid', false] },
                                    { $lte: ['$$emi.dueDate', fiveDaysAgo] }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    'overdueEmis.0': { $exists: true } // Has at least one EMI overdue by 5+ days
                }
            },
            {
                $project: {
                    fullName: 1,
                    'address.pincode': 1
                }
            }
        ]);

        console.log(`\n🔍 Assignment Debug:`);
        console.log(`   - Total locked customers: ${await Customer.countDocuments({ isLocked: true })}`);
        console.log(`   - Not collected: ${await Customer.countDocuments({ isLocked: true, isCollected: false })}`);
        console.log(`   - Already assigned: ${assignedCustomerIds.length}`);
        console.log(`   - Eligible (5+ days overdue): ${customersToAssign.length}`);

        if (customersToAssign.length > 0) {
            console.log(`   - Sample customer pincodes:`, customersToAssign.slice(0, 3).map(c => c.address.pincode));
        }

        // Check if there are any recovery persons
        const totalRecoveryPersons = await RecoveryPerson.countDocuments({ isActive: true });
        console.log(`   - Active recovery persons: ${totalRecoveryPersons}`);

        if (totalRecoveryPersons > 0) {
            const rpSample = await RecoveryPerson.findOne({ isActive: true }).select('fullName pinCodes');
            console.log(`   - Sample recovery person: ${rpSample?.fullName}, pincodes: ${rpSample?.pinCodes}`);
        }

        let assignedCount = 0;
        let noMatchCount = 0;
        const assignments = [];

        for (const customer of customersToAssign) {
            const customerPincode = customer.address.pincode;

            // Find all active recovery persons with matching pincode
            const matchingRecoveryPersons = await RecoveryPerson.find({
                isActive: true,
                pinCodes: customerPincode
            }).lean();

            if (matchingRecoveryPersons.length === 0) {
                console.log(`⚠️  No recovery person found for ${customer.fullName} (pincode: ${customerPincode})`);
                noMatchCount++;
                continue;
            }

            // Load balancing: select recovery person with least customers
            let selectedRecoveryPerson = matchingRecoveryPersons[0];
            let minCustomerCount = selectedRecoveryPerson.customers ? selectedRecoveryPerson.customers.length : 0;

            for (const rp of matchingRecoveryPersons) {
                const customerCount = rp.customers ? rp.customers.length : 0;
                if (customerCount < minCustomerCount) {
                    selectedRecoveryPerson = rp;
                    minCustomerCount = customerCount;
                }
            }

            // Get any recovery head for audit trail (since recovery persons are now global)
            // We'll use the first available recovery head or create a default entry
            const anyRecoveryHead = await RecoveryHead.findOne();

            if (!anyRecoveryHead) {
                console.log(`⚠️  No recovery head found in system`);
                noMatchCount++;
                continue;
            }

            // Create assignment record
            await RecoveryHeadAssignment.create({
                recoveryHeadId: anyRecoveryHead._id,
                recoveryHeadName: anyRecoveryHead.fullName,
                recoveryPersonId: selectedRecoveryPerson._id,
                recoveryPersonName: selectedRecoveryPerson.fullName,
                customerId: customer._id,
                customerName: customer.fullName,
                status: 'ACTIVE',
                assignedAt: new Date()
            });

            // Update customer assigned flag
            await Customer.findByIdAndUpdate(customer._id, {
                assigned: true
            });

            // Add customer to recovery person's customers array
            await RecoveryPerson.findByIdAndUpdate(
                selectedRecoveryPerson._id,
                { $addToSet: { customers: customer._id } }
            );

            console.log(`✅ Assigned ${customer.fullName} (${customerPincode}) to ${selectedRecoveryPerson.fullName} (${minCustomerCount} customers)`);

            assignments.push({
                customerId: customer._id.toString(),
                customerName: customer.fullName,
                pincode: customerPincode,
                recoveryPersonId: selectedRecoveryPerson._id.toString(),
                recoveryPersonName: selectedRecoveryPerson.fullName,
                recoveryHeadId: anyRecoveryHead._id.toString(),
                recoveryHeadName: anyRecoveryHead.fullName
            });

            assignedCount++;
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
/**
 * DEPRECATED - This function has been removed as it references old Customer assignment fields
 * that no longer exist in the updated schema. Assignments are now tracked via RecoveryHeadAssignment.
 */

/**
 * DEPRECATED - This migration function has been removed as it references old Customer assignment fields
 * that no longer exist in the updated schema. Assignments are now tracked via RecoveryHeadAssignment.
 */

/**
 * Get all customers assigned to recovery persons under the authenticated recovery head
 * Recovery Head only - requires authentication
 */
const getAssignedCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';

        const skip = (page - 1) * limit;

        const Customer = require('../models/Customer');
        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Get all active assignments (no longer filtered by recoveryHeadId - show all)
        let assignmentQuery = {
            status: 'ACTIVE'
        };

        const assignments = await RecoveryHeadAssignment.find(assignmentQuery)
            .populate('recoveryPersonId', 'fullName mobileNumber')
            .lean();

        const customerIds = assignments.map(a => a.customerId);

        // Build search query for customers
        let customerQuery = { _id: { $in: customerIds } };
        if (search) {
            customerQuery.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { mobileNumber: { $regex: search, $options: 'i' } },
                { imei1: { $regex: search, $options: 'i' } },
                { imei2: { $regex: search, $options: 'i' } }
            ];
        }

        // Get total count
        const totalItems = await Customer.countDocuments(customerQuery);

        // Get customers
        const customers = await Customer.find(customerQuery)
            .select('fullName mobileNumber aadharNumber dob fatherName address imei1 imei2 emiDetails isLocked isCollected documents')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        const totalPages = Math.ceil(totalItems / limit);

        // Create a map of customerId to assignment details
        const assignmentMap = {};
        assignments.forEach(assignment => {
            assignmentMap[assignment.customerId.toString()] = {
                recoveryPersonId: assignment.recoveryPersonId._id.toString(),
                recoveryPersonName: assignment.recoveryPersonId.fullName,
                recoveryPersonMobile: assignment.recoveryPersonId.mobileNumber,
                assignedAt: assignment.assignedAt
            };
        });

        // Format customer data
        const formattedCustomers = customers.map(customer => {
            const assignment = assignmentMap[customer._id.toString()];

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
                    isLocked: customer.isLocked,
                    isCollected: customer.isCollected
                },
                documents: {
                    customerPhoto: customer.documents.customerPhoto,
                    aadharFrontPhoto: customer.documents.aadharFrontPhoto,
                    aadharBackPhoto: customer.documents.aadharBackPhoto,
                    signaturePhoto: customer.documents.signaturePhoto
                },
                assignedTo: assignment ? {
                    recoveryPersonId: assignment.recoveryPersonId,
                    recoveryPersonName: assignment.recoveryPersonName,
                    recoveryPersonMobile: assignment.recoveryPersonMobile,
                    assignedAt: assignment.assignedAt
                } : null
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

        // Find customer (no ownership check - all recovery heads can access)
        const customer = await Customer.findById(customerId)
            .select('fullName mobileNumber location')
            .lean();

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
/**
 * DEPRECATED - This function has been removed as it references old Customer assignment fields
 * (assignedToRecoveryHeadId, assigned, assignedAt) that no longer exist in the updated schema.
 * Assignments are now tracked via RecoveryHeadAssignment model.
 */

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

        // Verify recovery person exists and is active (no ownership check)
        const recoveryPerson = await RecoveryPerson.findOne({
            _id: recoveryPersonId,
            isActive: true
        });

        if (!recoveryPerson) {
            return res.status(404).json({
                success: false,
                message: 'Recovery person not found or is inactive',
                error: 'RECOVERY_PERSON_NOT_FOUND'
            });
        }

        // Get recovery head details for audit trail
        const recoveryHead = await RecoveryHead.findById(recoveryHeadId);

        // Verify all customers exist (no ownership check)
        const customers = await Customer.find({
            _id: { $in: customerIds }
        });

        if (customers.length !== customerIds.length) {
            return res.status(404).json({
                success: false,
                message: 'Some customers not found',
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

        // Create assignments for all customers (keep recoveryHeadId for audit trail)
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';

        const skip = (page - 1) * limit;

        const RecoveryPerson = require('../models/RecoveryPerson');

        // Build query (no longer filtered by recoveryHeadId - show all)
        let query = {};

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
            .select('fullName mobileNumber pinCodes isActive customers')
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
                pinCodes: rp.pinCodes,
                isActive: rp.isActive,
                customersCount: totalCustomers,
                collectedCount: collectedCustomers,
                pendingCount: totalCustomers - collectedCustomers,
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

        // Find assignment (no ownership check - all recovery heads can view all assignments)
        const assignment = await RecoveryHeadAssignment.findById(assignmentId)
            .populate('recoveryPersonId', 'fullName mobileNumber isActive')
            .populate('customerId', 'fullName mobileNumber address emiDetails.balanceAmount isLocked')
            .lean();

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found',
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

        // Find assignment (no ownership check - all recovery heads can unassign)
        const assignment = await RecoveryHeadAssignment.findOne({
            _id: assignmentId,
            status: 'ACTIVE'
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Active assignment not found',
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

/**
 * Get statistics for the authenticated recovery head
 * Recovery Head only - requires authentication
 * Returns: total assigned customers, total recovery persons, total devices collected
 */
const getRecoveryHeadStatistics = async (req, res) => {
    try {
        const Customer = require('../models/Customer');
        const RecoveryPerson = require('../models/RecoveryPerson');
        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Get all active assignments (no longer filtered by recoveryHeadId - show all)
        const assignments = await RecoveryHeadAssignment.find({
            status: 'ACTIVE'
        }).lean();

        const customerIds = assignments.map(a => a.customerId);

        // Count total customers assigned to recovery persons
        const totalAssignedCustomers = customerIds.length;

        // Count total active recovery persons (all of them)
        const totalRecoveryPersons = await RecoveryPerson.countDocuments({
            isActive: true
        });

        // Count total devices collected
        const totalDevicesCollected = await Customer.countDocuments({
            _id: { $in: customerIds },
            isCollected: true
        });

        // Count pending collections
        const pendingCollections = totalAssignedCustomers - totalDevicesCollected;

        return res.status(200).json({
            success: true,
            message: 'Statistics fetched successfully',
            data: {
                totalRecoveryPersons,
                totalAssignedCustomers,
                pendingCollections,
                totalDevicesCollected,
                collectionRate: totalAssignedCustomers > 0
                    ? ((totalDevicesCollected / totalAssignedCustomers) * 100).toFixed(2)
                    : 0
            }
        });

    } catch (error) {
        console.error('Get recovery head statistics error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all collected customers with collection details
 * Recovery Head only - requires authentication
 * Returns: customers whose devices have been collected with full details
 */
const getCollectedCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';

        const skip = (page - 1) * limit;

        const Customer = require('../models/Customer');
        const RecoveryHeadAssignment = require('../models/RecoveryHeadAssignment');

        // Get all active assignments (no longer filtered by recoveryHeadId - show all)
        const assignments = await RecoveryHeadAssignment.find({
            status: 'ACTIVE'
        }).lean();

        const customerIds = assignments.map(a => a.customerId);

        // Build query for collected customers
        let customerQuery = {
            _id: { $in: customerIds },
            isCollected: true
        };

        // Add search filter
        if (search) {
            customerQuery.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { mobileNumber: { $regex: search, $options: 'i' } },
                { imei1: { $regex: search, $options: 'i' } },
                { imei2: { $regex: search, $options: 'i' } }
            ];
        }

        // Get total count
        const totalItems = await Customer.countDocuments(customerQuery);

        // Get collected customers with populated recovery person details
        const customers = await Customer.find(customerQuery)
            .populate('deviceCollection.collectedBy', 'fullName mobileNumber')
            .populate('retailerId', 'shopName mobileNumber')
            .select('fullName mobileNumber aadharNumber dob fatherName address imei1 imei2 emiDetails isLocked isCollected collectedAt deviceCollection documents')
            .skip(skip)
            .limit(limit)
            .sort({ collectedAt: -1 });

        const totalPages = Math.ceil(totalItems / limit);

        // Format customer data
        const formattedCustomers = customers.map(customer => {
            // Find next unpaid EMI
            const nextUnpaidEmi = customer.emiDetails.emiMonths
                .filter(emi => !emi.paid)
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

            return {
                customerId: customer._id.toString(),

                // Personal Information
                personalInfo: {
                    fullName: customer.fullName,
                    mobileNumber: customer.mobileNumber,
                    aadharNumber: customer.aadharNumber,
                    dob: customer.dob,
                    fatherName: customer.fatherName
                },

                // Address
                address: {
                    village: customer.address.village,
                    nearbyLocation: customer.address.nearbyLocation,
                    post: customer.address.post,
                    district: customer.address.district,
                    pincode: customer.address.pincode
                },

                // Device Information
                deviceInfo: {
                    imei1: customer.imei1,
                    imei2: customer.imei2 || null,
                    phoneType: customer.emiDetails.phoneType,
                    model: customer.emiDetails.model,
                    productName: customer.emiDetails.productName,
                    isLocked: customer.isLocked
                },

                // EMI Details
                emiDetails: {
                    branch: customer.emiDetails.branch,
                    sellPrice: customer.emiDetails.sellPrice,
                    landingPrice: customer.emiDetails.landingPrice,
                    downPayment: customer.emiDetails.downPayment,
                    downPaymentPending: customer.emiDetails.downPaymentPending,
                    emiRate: customer.emiDetails.emiRate,
                    numberOfMonths: customer.emiDetails.numberOfMonths,
                    emiPerMonth: customer.emiDetails.emiPerMonth,
                    balanceAmount: customer.emiDetails.balanceAmount,
                    totalEmiAmount: customer.emiDetails.totalEmiAmount,
                    nextUnpaidEmi: nextUnpaidEmi ? {
                        month: nextUnpaidEmi.month,
                        dueDate: nextUnpaidEmi.dueDate,
                        amount: nextUnpaidEmi.amount
                    } : null
                },

                // Customer Documents
                documents: {
                    customerPhoto: customer.documents.customerPhoto,
                    aadharFrontPhoto: customer.documents.aadharFrontPhoto,
                    aadharBackPhoto: customer.documents.aadharBackPhoto,
                    signaturePhoto: customer.documents.signaturePhoto
                },

                // Retailer Information
                retailer: customer.retailerId ? {
                    shopName: customer.retailerId.shopName,
                    mobileNumber: customer.retailerId.mobileNumber
                } : null,

                // Collection Status
                collectionStatus: {
                    isCollected: customer.isCollected,
                    collectedAt: customer.collectedAt
                },

                // Device Collection Details
                deviceCollection: {
                    deviceFrontImage: customer.deviceCollection.deviceFrontImage,
                    deviceBackImage: customer.deviceCollection.deviceBackImage,
                    devicePin: customer.deviceCollection.devicePin,
                    paymentDeadline: customer.deviceCollection.paymentDeadline,
                    notes: customer.deviceCollection.notes || null,

                    // Recovery Person who collected
                    collectedBy: customer.deviceCollection.collectedBy ? {
                        recoveryPersonId: customer.deviceCollection.collectedBy._id.toString(),
                        fullName: customer.deviceCollection.collectedBy.fullName,
                        mobileNumber: customer.deviceCollection.collectedBy.mobileNumber
                    } : {
                        recoveryPersonId: null,
                        fullName: customer.deviceCollection.collectedByName || 'Unknown',
                        mobileNumber: null
                    }
                }
            };
        });

        return res.status(200).json({
            success: true,
            message: 'Collected customers fetched successfully',
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
        console.error('Get collected customers error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch collected customers',
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
    assignCustomersToRecoveryPersons,
    getAssignedCustomers,
    getCustomerLocationByRecoveryHead,
    assignCustomersToRecoveryPerson,
    assignCustomersToRecoveryPersonValidation,
    getRecoveryPersonsWithCustomers,
    getAssignmentDetails,
    unassignCustomerFromRecoveryPerson,
    getRecoveryHeadStatistics,
    getCollectedCustomers
};

