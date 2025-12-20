const { body, validationResult } = require('express-validator');
const Accountant = require('../models/Accountant');
const { sendOTP, verifyOTP } = require('../utils/otpService');
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
 * Send OTP to accountant mobile number
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

        // Check if mobile number belongs to an accountant
        const accountant = await Accountant.findOne({ mobileNumber, mobileVerified: true });

        if (!accountant) {
            return res.status(403).json({
                success: false,
                message: 'This mobile number is not registered as accountant',
                error: 'UNAUTHORIZED_ACCESS'
            });
        }

        // Check if accountant is active
        if (!accountant.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Accountant account is inactive. Please contact admin.',
                error: 'ACCOUNT_INACTIVE'
            });
        }


        // Generate OTP
        const { generateOTP, saveOTP } = require('../utils/otpService');
        const otp = generateOTP();

        // Save OTP to database
        await saveOTP(mobileNumber, otp);

        // Send OTP via SMS
        await sendOTP(mobileNumber, otp);

        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;

        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            data: {
                otpSent: true,
                expiresIn: expiryMinutes * 60 // in seconds
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
 * Verify OTP and login accountant
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
            return res.status(401).json({
                success: false,
                message: otpVerification.message || 'Invalid or expired OTP',
                error: 'INVALID_OTP'
            });
        }

        // Get accountant details
        const accountant = await Accountant.findOne({ mobileNumber, mobileVerified: true });

        if (!accountant) {
            return res.status(401).json({
                success: false,
                message: 'Accountant not found',
                error: 'UNAUTHORIZED_ACCESS'
            });
        }

        // Check if accountant is active
        if (!accountant.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Accountant account is inactive',
                error: 'ACCOUNT_INACTIVE'
            });
        }

        // Generate JWT token
        const token = generateToken({
            id: accountant._id.toString(),
            mobileNumber: accountant.mobileNumber,
            role: 'accountant'
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                accountant: {
                    id: accountant._id.toString(),
                    fullName: accountant.fullName,
                    mobileNumber: accountant.mobileNumber,
                    aadharNumber: accountant.aadharNumber
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
