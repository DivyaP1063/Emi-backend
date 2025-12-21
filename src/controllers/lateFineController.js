const { body, validationResult } = require('express-validator');
const LateFine = require('../models/LateFine');

/**
 * Validation rules for updating late fine
 */
const updateLateFineValidation = [
    body('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isNumeric()
        .withMessage('Amount must be a number')
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number or zero')
];

/**
 * Get current late fine amount
 * Public endpoint - no authentication required
 */
const getLateFine = async (req, res) => {
    try {
        const lateFine = await LateFine.getSetting();

        return res.status(200).json({
            success: true,
            message: 'Late fine fetched successfully',
            data: {
                amount: lateFine.amount
            }
        });
    } catch (error) {
        console.error('Get late fine error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch late fine',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Update late fine amount
 * Admin-only endpoint - requires authentication
 */
const updateLateFine = async (req, res) => {
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

        const { amount } = req.body;
        const adminId = req.admin.id; // From authentication middleware

        // Update late fine setting
        const lateFine = await LateFine.updateSetting(amount, adminId);

        return res.status(200).json({
            success: true,
            message: 'Late fine updated successfully',
            data: {
                amount: lateFine.amount,
                updatedBy: lateFine.updatedBy,
                updatedAt: lateFine.updatedAt
            }
        });
    } catch (error) {
        console.error('Update late fine error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update late fine',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    getLateFine,
    updateLateFine,
    updateLateFineValidation
};
