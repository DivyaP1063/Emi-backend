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

module.exports = {
    createRecoveryHead,
    getAllRecoveryHeads,
    createRecoveryHeadValidation,
    updateRecoveryHeadStatus,
    updateRecoveryHeadStatusValidation
};
