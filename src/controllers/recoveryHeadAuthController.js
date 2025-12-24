const { body, validationResult } = require('express-validator');
const RecoveryHead = require('../models/RecoveryHead');
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
 * Send OTP to recovery head mobile number
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

        // Check if mobile number belongs to a recovery head
        const recoveryHead = await RecoveryHead.findOne({ mobileNumber, status: 'ACTIVE' });

        if (!recoveryHead) {
            return res.status(403).json({
                success: false,
                message: 'This mobile number is not registered as recovery head',
                error: 'UNAUTHORIZED_ACCESS'
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
            message: 'OTP sent successfully',
            data: {
                otpSent: true,
                expiresIn: expiryMinutes * 60,
                recoveryHeadExists: true
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
 * Verify OTP and login recovery head
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

        // Get recovery head details
        const recoveryHead = await RecoveryHead.findOne({ mobileNumber, status: 'ACTIVE' });

        if (!recoveryHead) {
            return res.status(401).json({
                success: false,
                message: 'Recovery head not found',
                error: 'UNAUTHORIZED_ACCESS'
            });
        }

        // Generate JWT token
        const token = generateToken({
            id: recoveryHead._id.toString(),
            mobileNumber: recoveryHead.mobileNumber,
            role: 'RECOVERY_HEAD'
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                recoveryHead: {
                    id: recoveryHead._id.toString(),
                    fullName: recoveryHead.fullName,
                    mobileNumber: recoveryHead.mobileNumber,
                    pinCodes: recoveryHead.pinCodes,
                    pinCodesCount: recoveryHead.pinCodes.length,
                    status: recoveryHead.status
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
