const { body, validationResult } = require('express-validator');
const Pincode = require('../models/Pincode');

/**
 * Validation middleware for creating pincode
 */
const createPincodeValidation = [
    body('pincode')
        .trim()
        .notEmpty()
        .withMessage('Pincode is required')
        .matches(/^[0-9]{6}$/)
        .withMessage('Pincode must be exactly 6 digits')
];

/**
 * Validation middleware for updating pincode
 */
const updatePincodeValidation = [
    body('pincode')
        .optional()
        .trim()
        .matches(/^[0-9]{6}$/)
        .withMessage('Pincode must be exactly 6 digits'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value')
];

/**
 * Create a new pincode
 */
const createPincode = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const { pincode } = req.body;

        // Check if pincode already exists
        const existingPincode = await Pincode.findOne({ pincode });
        if (existingPincode) {
            return res.status(400).json({
                success: false,
                message: 'Pincode already exists',
                error: 'DUPLICATE_PINCODE'
            });
        }

        // Create new pincode
        const newPincode = await Pincode.create({
            pincode
        });

        return res.status(201).json({
            success: true,
            message: 'Pincode created successfully',
            data: {
                id: newPincode._id.toString(),
                pincode: newPincode.pincode,
                isActive: newPincode.isActive,
                createdAt: newPincode.createdAt
            }
        });
    } catch (error) {
        console.error('Create pincode error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create pincode',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all pincodes with pagination, search, and filtering
 */
const getAllPincodes = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const isActive = req.query.isActive;

        const skip = (page - 1) * limit;

        // Build query
        let query = {};

        // Add search filter
        if (search) {
            query.pincode = { $regex: search, $options: 'i' };
        }

        // Add isActive filter
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Get total count
        const totalItems = await Pincode.countDocuments(query);

        // Get pincodes
        const pincodes = await Pincode.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ pincode: 1 });

        const totalPages = Math.ceil(totalItems / limit);

        return res.status(200).json({
            success: true,
            message: 'Pincodes fetched successfully',
            data: {
                pincodes: pincodes.map(p => ({
                    id: p._id.toString(),
                    pincode: p.pincode,
                    isActive: p.isActive,
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt
                })),
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Get all pincodes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch pincodes',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get single pincode by ID
 */
const getPincodeById = async (req, res) => {
    try {
        const { pincodeId } = req.params;

        const pincode = await Pincode.findById(pincodeId);

        if (!pincode) {
            return res.status(404).json({
                success: false,
                message: 'Pincode not found',
                error: 'PINCODE_NOT_FOUND'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Pincode fetched successfully',
            data: {
                id: pincode._id.toString(),
                pincode: pincode.pincode,
                isActive: pincode.isActive,
                createdAt: pincode.createdAt,
                updatedAt: pincode.updatedAt
            }
        });
    } catch (error) {
        console.error('Get pincode by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch pincode',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Update pincode
 */
const updatePincode = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const { pincodeId } = req.params;
        const { pincode, isActive } = req.body;

        // Find pincode
        const existingPincode = await Pincode.findById(pincodeId);

        if (!existingPincode) {
            return res.status(404).json({
                success: false,
                message: 'Pincode not found',
                error: 'PINCODE_NOT_FOUND'
            });
        }

        // Check if new pincode value already exists (if pincode is being updated)
        if (pincode && pincode !== existingPincode.pincode) {
            const duplicatePincode = await Pincode.findOne({ pincode });
            if (duplicatePincode) {
                return res.status(400).json({
                    success: false,
                    message: 'Pincode already exists',
                    error: 'DUPLICATE_PINCODE'
                });
            }
            existingPincode.pincode = pincode;
        }

        // Update isActive if provided
        if (isActive !== undefined) {
            existingPincode.isActive = isActive;
        }

        await existingPincode.save();

        return res.status(200).json({
            success: true,
            message: 'Pincode updated successfully',
            data: {
                id: existingPincode._id.toString(),
                pincode: existingPincode.pincode,
                isActive: existingPincode.isActive,
                updatedAt: existingPincode.updatedAt
            }
        });
    } catch (error) {
        console.error('Update pincode error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update pincode',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Delete pincode (soft delete - set isActive to false)
 */
const deletePincode = async (req, res) => {
    try {
        const { pincodeId } = req.params;

        const pincode = await Pincode.findById(pincodeId);

        if (!pincode) {
            return res.status(404).json({
                success: false,
                message: 'Pincode not found',
                error: 'PINCODE_NOT_FOUND'
            });
        }

        // Soft delete - set isActive to false
        pincode.isActive = false;
        await pincode.save();

        return res.status(200).json({
            success: true,
            message: 'Pincode deleted successfully',
            data: {
                id: pincode._id.toString(),
                pincode: pincode.pincode,
                isActive: pincode.isActive
            }
        });
    } catch (error) {
        console.error('Delete pincode error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete pincode',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all active pincodes for retailer dropdown (no pagination)
 */
const getActivePincodes = async (req, res) => {
    try {
        const pincodes = await Pincode.find({ isActive: true })
            .select('pincode')
            .sort({ pincode: 1 });

        return res.status(200).json({
            success: true,
            message: 'Active pincodes fetched successfully',
            data: {
                pincodes: pincodes.map(p => p.pincode),
                count: pincodes.length
            }
        });
    } catch (error) {
        console.error('Get active pincodes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch active pincodes',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    createPincodeValidation,
    updatePincodeValidation,
    createPincode,
    getAllPincodes,
    getPincodeById,
    updatePincode,
    deletePincode,
    getActivePincodes
};
