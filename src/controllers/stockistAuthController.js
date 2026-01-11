const { body, validationResult } = require('express-validator');
const Stockist = require('../models/Stockist');
const { generateOTP, saveOTP, verifyOTP, sendOTP } = require('../utils/otpService');
const { generateToken } = require('../utils/jwt');

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
 * Send OTP to stockist mobile number
 */
const sendOtpController = async (req, res) => {
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

        // Check if mobile number belongs to a stockist
        const stockist = await Stockist.findOne({ mobileNumber, isActive: true });

        if (!stockist) {
            return res.status(404).json({
                success: false,
                message: 'Stockist not found with this mobile number',
                error: 'STOCKIST_NOT_FOUND'
            });
        }

        // Generate OTP
        const otp = generateOTP();

        // Save OTP to database
        await saveOTP(mobileNumber, otp);

        // Send OTP via SMS
        await sendOTP(mobileNumber, otp);

        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

        return res.status(200).json({
            success: true,
            message: `OTP sent successfully to ${mobileNumber}`,
            data: {
                mobileNumber,
                expiresIn: expiryMinutes * 60
            }
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
 * Verify OTP and login stockist
 */
const verifyOtpController = async (req, res) => {
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

        // Get stockist details
        const stockist = await Stockist.findOne({ mobileNumber, isActive: true });

        if (!stockist) {
            return res.status(404).json({
                success: false,
                message: 'Stockist not found or inactive',
                error: 'STOCKIST_NOT_FOUND'
            });
        }

        // Update mobile verified status
        if (!stockist.mobileVerified) {
            stockist.mobileVerified = true;
            await stockist.save();
        }

        // Generate JWT token
        const token = generateToken({
            id: stockist._id.toString(),
            mobileNumber: stockist.mobileNumber,
            role: 'STOCKIST'
        });

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            data: {
                token,
                stockist: {
                    stockistId: stockist._id.toString(),
                    fullName: stockist.fullName,
                    shopName: stockist.shopName,
                    mobileNumber: stockist.mobileNumber,
                    address: stockist.address
                }
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

module.exports = {
    sendOtpController,
    verifyOtpController,
    sendOtpValidation,
    verifyOtpValidation
};
