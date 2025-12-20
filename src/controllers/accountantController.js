const { body, validationResult } = require('express-validator');
const Accountant = require('../models/Accountant');
const { sendOTP, verifyOTP } = require('../utils/otpService');

/**
 * Validation rules for send OTP
 */
const sendOtpValidation = [
    body('mobileNumber')
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Mobile number must be exactly 10 digits')
];

/**
 * Validation rules for verify OTP
 */
const verifyOtpValidation = [
    body('mobileNumber')
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Mobile number must be exactly 10 digits'),
    body('otp')
        .trim()
        .matches(/^[0-9]{6}$/)
        .withMessage('OTP must be exactly 6 digits')
];

/**
 * Validation rules for create accountant
 */
const createAccountantValidation = [
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
 * Send OTP to mobile number (Admin only)
 */
const sendOtpForAccountant = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number format',
                error: 'VALIDATION_ERROR',
                details: errors.array()
            });
        }

        const { mobileNumber } = req.body;

        // Check if mobile already exists
        const existingMobile = await Accountant.findOne({ mobileNumber });
        if (existingMobile) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number already registered',
                error: 'DUPLICATE_MOBILE'
            });
        }


        // Generate OTP
        const { generateOTP, saveOTP } = require('../utils/otpService');
        const otp = generateOTP();

        // Save OTP to database
        await saveOTP(mobileNumber, otp);

        // Send OTP via SMS
        await sendOTP(mobileNumber, otp);

        return res.status(200).json({
            success: true,
            message: `OTP sent successfully to +91${mobileNumber}`
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send OTP',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Verify OTP for mobile number (Admin only)
 */
const verifyOtpForAccountant = async (req, res) => {
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

        const { mobileNumber, otp } = req.body;

        // Verify OTP
        const otpVerification = await verifyOTP(mobileNumber, otp);

        if (!otpVerification.success) {
            return res.status(400).json({
                success: false,
                message: otpVerification.message || 'Invalid or expired OTP',
                error: 'INVALID_OTP'
            });
        }

        // OTP verified successfully
        return res.status(200).json({
            success: true,
            message: 'Mobile number verified successfully. You can proceed to create accountant.',
            data: {
                mobileNumber,
                verified: true
            }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify OTP',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Create accountant (Admin only)
 * Note: Mobile number should already be verified via verify-otp endpoint
 */
const createAccountant = async (req, res) => {
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

        // Check if aadhar already exists
        const existingAadhar = await Accountant.findOne({ aadharNumber });
        if (existingAadhar) {
            return res.status(400).json({
                success: false,
                message: 'Accountant with this Aadhar number already exists',
                error: 'DUPLICATE_AADHAR'
            });
        }

        // Check if mobile already exists
        const existingMobile = await Accountant.findOne({ mobileNumber });
        if (existingMobile) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number already registered',
                error: 'DUPLICATE_MOBILE'
            });
        }

        // Create accountant
        const accountant = await Accountant.create({
            fullName,
            aadharNumber,
            mobileNumber,
            mobileVerified: true,
            isActive: true
        });

        return res.status(201).json({
            success: true,
            message: 'Accountant created successfully',
            data: {
                accountantId: accountant._id.toString(),
                fullName: accountant.fullName,
                aadharNumber: accountant.aadharNumber,
                mobileNumber: accountant.mobileNumber,
                mobileVerified: accountant.mobileVerified,
                isActive: accountant.isActive,
                createdAt: accountant.createdAt
            }
        });
    } catch (error) {
        console.error('Create accountant error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create accountant',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get all accountants (Admin only)
 */
const getAllAccountants = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery = {
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { mobileNumber: { $regex: search, $options: 'i' } },
                    { aadharNumber: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Get total count
        const totalAccountants = await Accountant.countDocuments(searchQuery);

        // Fetch accountants with pagination
        const accountants = await Accountant.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const totalPages = Math.ceil(totalAccountants / limitNum);

        return res.status(200).json({
            success: true,
            message: 'Accountants fetched successfully',
            data: {
                accountants: accountants.map(acc => ({
                    id: acc._id.toString(),
                    fullName: acc.fullName,
                    aadharNumber: acc.aadharNumber,
                    mobileNumber: acc.mobileNumber,
                    mobileVerified: acc.mobileVerified,
                    isActive: acc.isActive,
                    createdAt: acc.createdAt,
                    updatedAt: acc.updatedAt
                })),
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalItems: totalAccountants,
                    itemsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });
    } catch (error) {
        console.error('Get all accountants error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch accountants',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Update accountant status (Admin only)
 */
const updateAccountantStatus = async (req, res) => {
    try {
        const { accountantId } = req.params;
        const { isActive } = req.body;

        // Validate required fields
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive status is required and must be a boolean',
                error: 'VALIDATION_ERROR'
            });
        }

        // Validate accountant ID format
        if (!accountantId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid accountant ID format',
                error: 'VALIDATION_ERROR'
            });
        }

        // Find accountant
        const accountant = await Accountant.findById(accountantId);
        if (!accountant) {
            return res.status(404).json({
                success: false,
                message: 'Accountant not found',
                error: 'ACCOUNTANT_NOT_FOUND'
            });
        }

        // Update status
        const previousStatus = accountant.isActive;
        accountant.isActive = isActive;
        await accountant.save();

        return res.status(200).json({
            success: true,
            message: `Accountant ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                accountantId: accountant._id.toString(),
                fullName: accountant.fullName,
                previousStatus,
                currentStatus: accountant.isActive,
                updatedAt: accountant.updatedAt
            }
        });
    } catch (error) {
        console.error('Update accountant status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update accountant status',
            error: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    sendOtpForAccountant,
    verifyOtpForAccountant,
    createAccountant,
    getAllAccountants,
    updateAccountantStatus,
    sendOtpValidation,
    verifyOtpValidation,
    createAccountantValidation
};
