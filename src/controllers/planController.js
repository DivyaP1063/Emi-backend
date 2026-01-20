const { body, validationResult } = require('express-validator');
const EmiPlan = require('../models/EmiPlan');
const Retailer = require('../models/Retailer');

/**
 * Validation rules for create/update EMI plan
 */
const createPlanValidation = [
    body('planName')
        .trim()
        .notEmpty()
        .withMessage('Plan name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Plan name must be between 2 and 100 characters'),
    body('monthlyRates')
        .isArray({ min: 1 })
        .withMessage('Monthly rates must be an array with at least 1 month'),
    body('monthlyRates.*.month')
        .isInt({ min: 1 })
        .withMessage('Month must be a positive integer'),
    body('monthlyRates.*.rate')
        .isFloat({ min: 0 })
        .withMessage('Rate must be a non-negative number')
];

/**
 * Create new EMI plan
 */
const createPlan = async (req, res) => {
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

        const { planName, monthlyRates } = req.body;

        // Check if plan name already exists
        const existingPlan = await EmiPlan.findOne({ planName });
        if (existingPlan) {
            return res.status(400).json({
                success: false,
                message: 'Plan name already exists',
                error: 'DUPLICATE_PLAN_NAME'
            });
        }

        // Validate that months are sequential starting from 1
        const sortedRates = [...monthlyRates].sort((a, b) => a.month - b.month);
        for (let i = 0; i < sortedRates.length; i++) {
            if (sortedRates[i].month !== i + 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Monthly rates must be sequential starting from month 1',
                    error: 'INVALID_MONTH_SEQUENCE',
                    details: {
                        expected: i + 1,
                        received: sortedRates[i].month
                    }
                });
            }
        }

        // Create plan
        const plan = await EmiPlan.create({
            planName,
            monthlyRates: sortedRates
        });

        return res.status(201).json({
            success: true,
            message: 'EMI plan created successfully',
            data: {
                planId: plan._id,
                planName: plan.planName,
                monthlyRates: plan.monthlyRates,
                maxMonths: plan.monthlyRates.length,
                isActive: plan.isActive,
                createdAt: plan.createdAt
            }
        });
    } catch (error) {
        console.error('Create plan error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create EMI plan',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all EMI plans with pagination and filters
 */
const getAllPlans = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter
        const filter = {};

        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === 'true';
        }

        if (req.query.search) {
            filter.$text = { $search: req.query.search };
        }

        // Get total count
        const totalPlans = await EmiPlan.countDocuments(filter);

        // Get plans
        const plans = await EmiPlan.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Format response
        const formattedPlans = plans.map(plan => ({
            planId: plan._id,
            planName: plan.planName,
            monthlyRates: plan.monthlyRates,
            maxMonths: plan.monthlyRates.length,
            isActive: plan.isActive,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt
        }));

        return res.status(200).json({
            success: true,
            message: 'EMI plans fetched successfully',
            data: {
                plans: formattedPlans,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalPlans / limit),
                    totalPlans,
                    limit
                }
            }
        });
    } catch (error) {
        console.error('Get all plans error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch EMI plans',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get plan details by ID
 */
const getPlanById = async (req, res) => {
    try {
        const { planId } = req.params;

        const plan = await EmiPlan.findById(planId).lean();

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'EMI plan not found',
                error: 'NOT_FOUND'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'EMI plan fetched successfully',
            data: {
                planId: plan._id,
                planName: plan.planName,
                monthlyRates: plan.monthlyRates,
                maxMonths: plan.monthlyRates.length,
                isActive: plan.isActive,
                createdAt: plan.createdAt,
                updatedAt: plan.updatedAt
            }
        });
    } catch (error) {
        console.error('Get plan by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch EMI plan',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Update EMI plan
 */
const updatePlan = async (req, res) => {
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

        const { planId } = req.params;
        const { planName, monthlyRates } = req.body;

        // Check if plan exists
        const plan = await EmiPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'EMI plan not found',
                error: 'NOT_FOUND'
            });
        }

        // Check if new plan name already exists (if changing name)
        if (planName && planName !== plan.planName) {
            const existingPlan = await EmiPlan.findOne({ planName, _id: { $ne: planId } });
            if (existingPlan) {
                return res.status(400).json({
                    success: false,
                    message: 'Plan name already exists',
                    error: 'DUPLICATE_PLAN_NAME'
                });
            }
        }

        // Validate that months are sequential starting from 1
        if (monthlyRates) {
            const sortedRates = [...monthlyRates].sort((a, b) => a.month - b.month);
            for (let i = 0; i < sortedRates.length; i++) {
                if (sortedRates[i].month !== i + 1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Monthly rates must be sequential starting from month 1',
                        error: 'INVALID_MONTH_SEQUENCE',
                        details: {
                            expected: i + 1,
                            received: sortedRates[i].month
                        }
                    });
                }
            }
            plan.monthlyRates = sortedRates;
        }

        // Update plan
        if (planName) plan.planName = planName;

        await plan.save();

        return res.status(200).json({
            success: true,
            message: 'EMI plan updated successfully',
            data: {
                planId: plan._id,
                planName: plan.planName,
                monthlyRates: plan.monthlyRates,
                maxMonths: plan.monthlyRates.length,
                isActive: plan.isActive,
                updatedAt: plan.updatedAt
            }
        });
    } catch (error) {
        console.error('Update plan error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update EMI plan',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Delete (deactivate) EMI plan
 */
const deletePlan = async (req, res) => {
    try {
        const { planId } = req.params;

        // Check if plan exists
        const plan = await EmiPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'EMI plan not found',
                error: 'NOT_FOUND'
            });
        }

        // Check if plan is assigned to any active retailers
        const assignedRetailers = await Retailer.countDocuments({
            assignedPlanId: planId,
            status: 'ACTIVE'
        });

        if (assignedRetailers > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete plan. It is assigned to ${assignedRetailers} active retailer(s)`,
                error: 'PLAN_IN_USE',
                details: {
                    assignedRetailers
                }
            });
        }

        // Soft delete - set isActive to false
        plan.isActive = false;
        await plan.save();

        return res.status(200).json({
            success: true,
            message: 'EMI plan deleted successfully',
            data: {
                planId: plan._id,
                planName: plan.planName,
                isActive: plan.isActive
            }
        });
    } catch (error) {
        console.error('Delete plan error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete EMI plan',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Assign plan to retailer
 */
const assignPlanToRetailer = async (req, res) => {
    try {
        const { retailerId } = req.params;
        const { planId } = req.body;

        // Validate planId
        if (!planId) {
            return res.status(400).json({
                success: false,
                message: 'Plan ID is required',
                error: 'VALIDATION_ERROR'
            });
        }

        // Check if plan exists and is active
        const plan = await EmiPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'EMI plan not found',
                error: 'PLAN_NOT_FOUND'
            });
        }

        if (!plan.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Cannot assign inactive plan',
                error: 'PLAN_INACTIVE'
            });
        }

        // Check if retailer exists
        const retailer = await Retailer.findById(retailerId);
        if (!retailer) {
            return res.status(404).json({
                success: false,
                message: 'Retailer not found',
                error: 'RETAILER_NOT_FOUND'
            });
        }

        // Assign plan to retailer
        retailer.assignedPlanId = planId;
        await retailer.save();

        // Populate plan details for response
        await retailer.populate('assignedPlanId');

        return res.status(200).json({
            success: true,
            message: 'Plan assigned to retailer successfully',
            data: {
                retailerId: retailer._id,
                retailerName: retailer.fullName,
                assignedPlan: {
                    planId: plan._id,
                    planName: plan.planName,
                    monthlyRates: plan.monthlyRates,
                    maxMonths: plan.monthlyRates.length
                }
            }
        });
    } catch (error) {
        console.error('Assign plan to retailer error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to assign plan to retailer',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    createPlan,
    getAllPlans,
    getPlanById,
    updatePlan,
    deletePlan,
    assignPlanToRetailer,
    createPlanValidation
};
