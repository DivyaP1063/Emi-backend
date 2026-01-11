const { body, validationResult } = require('express-validator');
const Stockist = require('../models/Stockist');
const DeviceSubmission = require('../models/DeviceSubmission');
const Customer = require('../models/Customer');
const RecoveryPerson = require('../models/RecoveryPerson');

/**
 * Get dashboard statistics for the authenticated stockist
 */
const getDashboardStats = async (req, res) => {
    try {
        const stockistId = req.stockist.id;

        // Total devices received
        const totalDevicesReceived = await DeviceSubmission.countDocuments({
            stockistId
        });

        // Pending action
        const pendingAction = await DeviceSubmission.countDocuments({
            stockistId,
            status: 'PENDING'
        });

        // Returned to customer
        const returnedToCustomer = await DeviceSubmission.countDocuments({
            stockistId,
            status: 'RETURNED_TO_CUSTOMER'
        });

        // Sent to repair
        const sentToRepair = await DeviceSubmission.countDocuments({
            stockistId,
            status: 'SENT_TO_REPAIR'
        });

        // Sent to resell
        const sentToResell = await DeviceSubmission.countDocuments({
            stockistId,
            status: 'SENT_TO_RESELL'
        });

        // Overdue devices (pending and past deadline)
        const overdueDevices = await DeviceSubmission.countDocuments({
            stockistId,
            status: 'PENDING',
            paymentDeadline: { $lt: new Date() }
        });

        // Today's submissions
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todaySubmissions = await DeviceSubmission.countDocuments({
            stockistId,
            submittedAt: { $gte: todayStart, $lte: todayEnd }
        });

        return res.status(200).json({
            success: true,
            message: 'Dashboard statistics fetched successfully',
            data: {
                totalDevicesReceived,
                pendingAction,
                returnedToCustomer,
                sentToRepair,
                sentToResell,
                overdueDevices,
                todaySubmissions
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
 * Get submitted devices with filtering and pagination
 */
const getSubmittedDevices = async (req, res) => {
    try {
        const stockistId = req.stockist.id;
        const {
            status = 'all',
            page = 1,
            limit = 20,
            sortBy = 'submittedAt',
            sortOrder = 'desc'
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = Math.min(parseInt(limit), 100); // Max 100 items per page
        const skip = (pageNum - 1) * limitNum;

        // Build query
        let query = { stockistId };
        if (status !== 'all') {
            query.status = status.toUpperCase();
        }

        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Get total count
        const totalItems = await DeviceSubmission.countDocuments(query);

        // Fetch submissions with populated data
        const submissions = await DeviceSubmission.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .populate('customerId')
            .populate('recoveryPersonId', 'fullName mobileNumber')
            .lean();

        // Format response
        const devices = submissions.map(sub => {
            const customer = sub.customerId;
            const now = new Date();
            const deadline = new Date(sub.paymentDeadline);
            const isOverdue = deadline < now && sub.status === 'PENDING';
            const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

            return {
                submissionId: sub._id.toString(),
                status: sub.status,
                submittedAt: sub.submittedAt,
                paymentDeadline: sub.paymentDeadline,
                isOverdue,
                daysUntilDeadline,
                customer: {
                    customerId: customer._id.toString(),
                    fullName: customer.fullName,
                    mobileNumber: customer.mobileNumber,
                    address: {
                        village: customer.address.village,
                        district: customer.address.district,
                        pincode: customer.address.pincode
                    }
                },
                device: {
                    productName: customer.emiDetails.productName,
                    model: customer.emiDetails.model,
                    imei1: customer.imei1,
                    phoneType: customer.emiDetails.phoneType
                },
                emiDetails: {
                    balanceAmount: customer.emiDetails.balanceAmount,
                    sellPrice: customer.emiDetails.sellPrice,
                    downPaymentPending: customer.emiDetails.downPaymentPending
                },
                recoveryPerson: {
                    fullName: sub.recoveryPersonId.fullName,
                    mobileNumber: sub.recoveryPersonId.mobileNumber
                },
                collectionInfo: {
                    deviceFrontImage: customer.deviceCollection.deviceFrontImage,
                    deviceBackImage: customer.deviceCollection.deviceBackImage,
                    devicePin: customer.deviceCollection.devicePin,
                    notes: customer.deviceCollection.notes
                }
            };
        });

        const totalPages = Math.ceil(totalItems / limitNum);

        return res.status(200).json({
            success: true,
            message: 'Submitted devices fetched successfully',
            data: {
                devices,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });
    } catch (error) {
        console.error('Get submitted devices error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch submitted devices',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get complete details of a specific device submission
 */
const getDeviceDetails = async (req, res) => {
    try {
        const stockistId = req.stockist.id;
        const { submissionId } = req.params;

        // Validate submission ID format
        if (!submissionId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID format',
                error: 'VALIDATION_ERROR'
            });
        }

        // Get submission
        const submission = await DeviceSubmission.findById(submissionId)
            .populate('customerId')
            .populate('recoveryPersonId', 'fullName mobileNumber')
            .lean();

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Device submission not found',
                error: 'SUBMISSION_NOT_FOUND'
            });
        }

        // Verify submission belongs to this stockist
        if (submission.stockistId.toString() !== stockistId) {
            return res.status(403).json({
                success: false,
                message: 'This device was not submitted to you',
                error: 'NOT_AUTHORIZED'
            });
        }

        const customer = submission.customerId;
        const now = new Date();
        const deadline = new Date(submission.paymentDeadline);
        const isOverdue = deadline < now && submission.status === 'PENDING';
        const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        return res.status(200).json({
            success: true,
            message: 'Device details fetched successfully',
            data: {
                submissionId: submission._id.toString(),
                status: submission.status,
                submittedAt: submission.submittedAt,
                paymentDeadline: submission.paymentDeadline,
                isOverdue,
                daysUntilDeadline,
                customer: {
                    customerId: customer._id.toString(),
                    fullName: customer.fullName,
                    fatherName: customer.fatherName,
                    mobileNumber: customer.mobileNumber,
                    aadharNumber: customer.aadharNumber,
                    dob: customer.dob,
                    address: customer.address,
                    documents: {
                        customerPhoto: customer.documents.customerPhoto,
                        aadharFrontPhoto: customer.documents.aadharFrontPhoto,
                        aadharBackPhoto: customer.documents.aadharBackPhoto
                    }
                },
                device: {
                    productName: customer.emiDetails.productName,
                    model: customer.emiDetails.model,
                    imei1: customer.imei1,
                    imei2: customer.imei2,
                    phoneType: customer.emiDetails.phoneType
                },
                emiDetails: {
                    branch: customer.emiDetails.branch,
                    sellPrice: customer.emiDetails.sellPrice,
                    landingPrice: customer.emiDetails.landingPrice,
                    downPayment: customer.emiDetails.downPayment,
                    downPaymentPending: customer.emiDetails.downPaymentPending,
                    emiPerMonth: customer.emiDetails.emiPerMonth,
                    numberOfMonths: customer.emiDetails.numberOfMonths,
                    totalEmiAmount: customer.emiDetails.totalEmiAmount,
                    balanceAmount: customer.emiDetails.balanceAmount,
                    emiRate: customer.emiDetails.emiRate,
                    emiMonths: customer.emiDetails.emiMonths
                },
                collectionInfo: {
                    collectedAt: customer.collectedAt,
                    collectedBy: submission.recoveryPersonId.fullName,
                    deviceFrontImage: customer.deviceCollection.deviceFrontImage,
                    deviceBackImage: customer.deviceCollection.deviceBackImage,
                    devicePin: customer.deviceCollection.devicePin,
                    notes: customer.deviceCollection.notes
                },
                recoveryPerson: {
                    recoveryPersonId: submission.recoveryPersonId._id.toString(),
                    fullName: submission.recoveryPersonId.fullName,
                    mobileNumber: submission.recoveryPersonId.mobileNumber
                }
            }
        });
    } catch (error) {
        console.error('Get device details error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch device details',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Validation rules for mark customer retrieved
 */
const markCustomerRetrievedValidation = [
    body('submissionId')
        .trim()
        .notEmpty()
        .withMessage('Submission ID is required')
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid submission ID format'),
    body('amountPaid')
        .isFloat({ min: 0 })
        .withMessage('Amount paid must be a positive number'),
    body('paymentMethod')
        .trim()
        .notEmpty()
        .withMessage('Payment method is required')
        .isIn(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'])
        .withMessage('Invalid payment method'),
    body('notes')
        .optional()
        .trim()
];

/**
 * Mark that customer came and retrieved device
 */
const markCustomerRetrieved = async (req, res) => {
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

        const stockistId = req.stockist.id;
        const { submissionId, amountPaid, paymentMethod, notes } = req.body;

        // Get submission
        const submission = await DeviceSubmission.findById(submissionId).populate('customerId');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Device submission not found',
                error: 'SUBMISSION_NOT_FOUND'
            });
        }

        // Verify submission belongs to this stockist
        if (submission.stockistId.toString() !== stockistId) {
            return res.status(403).json({
                success: false,
                message: 'This device was not submitted to you',
                error: 'NOT_AUTHORIZED'
            });
        }

        // Check if status is PENDING
        if (submission.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: `Device is not in pending status. Current status: ${submission.status}`,
                error: 'INVALID_STATUS'
            });
        }

        // Update submission
        submission.status = 'RETURNED_TO_CUSTOMER';
        submission.customerRetrievalInfo = {
            retrievedAt: new Date(),
            amountPaid,
            paymentMethod,
            notes: notes || null
        };
        submission.actionTakenAt = new Date();
        submission.actionTakenBy = stockistId;
        await submission.save();

        return res.status(200).json({
            success: true,
            message: 'Device marked as returned to customer successfully',
            data: {
                submissionId: submission._id.toString(),
                status: submission.status,
                customerName: submission.customerId.fullName,
                amountPaid,
                paymentMethod,
                retrievedAt: submission.customerRetrievalInfo.retrievedAt
            }
        });
    } catch (error) {
        console.error('Mark customer retrieved error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to mark customer retrieved',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Validation rules for send to repair
 */
const sendToRepairValidation = [
    body('submissionId')
        .trim()
        .notEmpty()
        .withMessage('Submission ID is required')
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid submission ID format'),
    body('estimatedCost')
        .isFloat({ min: 0 })
        .withMessage('Estimated cost must be a positive number'),
    body('repairVendor')
        .optional()
        .trim(),
    body('repairNotes')
        .optional()
        .trim()
];

/**
 * Send device to repair
 */
const sendToRepair = async (req, res) => {
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

        const stockistId = req.stockist.id;
        const { submissionId, estimatedCost, repairVendor, repairNotes } = req.body;

        // Get submission
        const submission = await DeviceSubmission.findById(submissionId).populate('customerId');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Device submission not found',
                error: 'SUBMISSION_NOT_FOUND'
            });
        }

        // Verify submission belongs to this stockist
        if (submission.stockistId.toString() !== stockistId) {
            return res.status(403).json({
                success: false,
                message: 'This device was not submitted to you',
                error: 'NOT_AUTHORIZED'
            });
        }

        // Check if status is PENDING
        if (submission.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Device is not in pending status',
                error: 'INVALID_STATUS'
            });
        }

        // Update submission
        submission.status = 'SENT_TO_REPAIR';
        submission.repairInfo = {
            sentToRepairAt: new Date(),
            estimatedCost,
            repairVendor: repairVendor || null,
            repairNotes: repairNotes || null
        };
        submission.actionTakenAt = new Date();
        submission.actionTakenBy = stockistId;
        await submission.save();

        return res.status(200).json({
            success: true,
            message: 'Device sent to repair successfully',
            data: {
                submissionId: submission._id.toString(),
                status: submission.status,
                customerName: submission.customerId.fullName,
                deviceInfo: `${submission.customerId.emiDetails.productName}`,
                estimatedCost,
                repairVendor,
                sentToRepairAt: submission.repairInfo.sentToRepairAt
            }
        });
    } catch (error) {
        console.error('Send to repair error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send device to repair',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Validation rules for send to resell
 */
const sendToResellValidation = [
    body('submissionId')
        .trim()
        .notEmpty()
        .withMessage('Submission ID is required')
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid submission ID format'),
    body('estimatedValue')
        .isFloat({ min: 0 })
        .withMessage('Estimated value must be a positive number'),
    body('resellPlatform')
        .optional()
        .trim(),
    body('resellNotes')
        .optional()
        .trim()
];

/**
 * Send device to resell
 */
const sendToResell = async (req, res) => {
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

        const stockistId = req.stockist.id;
        const { submissionId, estimatedValue, resellPlatform, resellNotes } = req.body;

        // Get submission
        const submission = await DeviceSubmission.findById(submissionId).populate('customerId');

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Device submission not found',
                error: 'SUBMISSION_NOT_FOUND'
            });
        }

        // Verify submission belongs to this stockist
        if (submission.stockistId.toString() !== stockistId) {
            return res.status(403).json({
                success: false,
                message: 'This device was not submitted to you',
                error: 'NOT_AUTHORIZED'
            });
        }

        // Check if status is PENDING
        if (submission.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Device is not in pending status',
                error: 'INVALID_STATUS'
            });
        }

        // Update submission
        submission.status = 'SENT_TO_RESELL';
        submission.resellInfo = {
            sentToResellAt: new Date(),
            estimatedValue,
            resellPlatform: resellPlatform || null,
            resellNotes: resellNotes || null
        };
        submission.actionTakenAt = new Date();
        submission.actionTakenBy = stockistId;
        await submission.save();

        return res.status(200).json({
            success: true,
            message: 'Device sent to resell successfully',
            data: {
                submissionId: submission._id.toString(),
                status: submission.status,
                customerName: submission.customerId.fullName,
                deviceInfo: `${submission.customerId.emiDetails.productName}`,
                estimatedValue,
                resellPlatform,
                sentToResellAt: submission.resellInfo.sentToResellAt
            }
        });
    } catch (error) {
        console.error('Send to resell error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send device to resell',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get transaction history with filtering
 */
const getTransactionHistory = async (req, res) => {
    try {
        const stockistId = req.stockist.id;
        const {
            status = 'all',
            startDate,
            endDate,
            page = 1,
            limit = 20
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = Math.min(parseInt(limit), 100);
        const skip = (pageNum - 1) * limitNum;

        // Build query - only completed transactions
        let query = {
            stockistId,
            status: { $ne: 'PENDING' }
        };

        if (status !== 'all') {
            query.status = status.toUpperCase();
        }

        if (startDate || endDate) {
            query.actionTakenAt = {};
            if (startDate) {
                query.actionTakenAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.actionTakenAt.$lte = new Date(endDate);
            }
        }

        // Get total count
        const totalItems = await DeviceSubmission.countDocuments(query);

        // Fetch transactions
        const transactions = await DeviceSubmission.find(query)
            .sort({ actionTakenAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('customerId', 'fullName mobileNumber emiDetails imei1')
            .lean();

        // Calculate summary
        let totalAmountCollected = 0;
        let totalRepairCost = 0;
        let totalResellValue = 0;

        transactions.forEach(t => {
            if (t.status === 'RETURNED_TO_CUSTOMER' && t.customerRetrievalInfo) {
                totalAmountCollected += t.customerRetrievalInfo.amountPaid || 0;
            }
            if (t.status === 'SENT_TO_REPAIR' && t.repairInfo) {
                totalRepairCost += t.repairInfo.estimatedCost || 0;
            }
            if (t.status === 'SENT_TO_RESELL' && t.resellInfo) {
                totalResellValue += t.resellInfo.estimatedValue || 0;
            }
        });

        // Format response
        const formattedTransactions = transactions.map(t => {
            const base = {
                submissionId: t._id.toString(),
                status: t.status,
                submittedAt: t.submittedAt,
                actionTakenAt: t.actionTakenAt,
                customer: {
                    fullName: t.customerId.fullName,
                    mobileNumber: t.customerId.mobileNumber
                },
                device: {
                    productName: t.customerId.emiDetails.productName,
                    imei1: t.customerId.imei1
                }
            };

            if (t.status === 'RETURNED_TO_CUSTOMER') {
                base.customerRetrievalInfo = t.customerRetrievalInfo;
            } else if (t.status === 'SENT_TO_REPAIR') {
                base.repairInfo = t.repairInfo;
            } else if (t.status === 'SENT_TO_RESELL') {
                base.resellInfo = t.resellInfo;
            }

            return base;
        });

        const totalPages = Math.ceil(totalItems / limitNum);

        return res.status(200).json({
            success: true,
            message: 'Transaction history fetched successfully',
            data: {
                transactions: formattedTransactions,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                },
                summary: {
                    totalTransactions: totalItems,
                    totalAmountCollected,
                    totalRepairCost,
                    totalResellValue
                }
            }
        });
    } catch (error) {
        console.error('Get transaction history error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction history',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    getDashboardStats,
    getSubmittedDevices,
    getDeviceDetails,
    markCustomerRetrieved,
    markCustomerRetrievedValidation,
    sendToRepair,
    sendToRepairValidation,
    sendToResell,
    sendToResellValidation,
    getTransactionHistory
};
