const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
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
 * Send OTP to admin mobile number
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

    // Check if mobile number belongs to an admin
    const admin = await Admin.findOne({ mobileNumber, isActive: true });

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'This mobile number is not registered as admin',
        error: 'UNAUTHORIZED_ACCESS'
      });
    }

    // Generate OTP (always random)
    const otp = generateOTP();

    // Save OTP to database
    await saveOTP(mobileNumber, otp);

    // Send OTP via SMS
    const smsSent = await sendOTP(mobileNumber, otp);
    
    if (!smsSent && process.env.SMS_ENABLED === 'true') {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        error: 'SMS_SEND_FAILED'
      });
    }

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
 * Verify OTP and login admin
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

    // Get admin details
    const admin = await Admin.findOne({ mobileNumber, isActive: true });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found',
        error: 'UNAUTHORIZED_ACCESS'
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: admin._id.toString(),
      mobileNumber: admin.mobileNumber,
      role: admin.role
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin._id.toString(),
          name: admin.name,
          mobileNumber: admin.mobileNumber,
          email: admin.email
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

/**
 * Get all customers (Admin only)
 */
const getAllCustomers = async (req, res) => {
  try {
    const Customer = require('../models/Customer');
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
          { aadharNumber: { $regex: search, $options: 'i' } },
          { imei1: { $regex: search, $options: 'i' } },
          { imei2: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get total count
    const totalCustomers = await Customer.countDocuments(searchQuery);

    // Fetch customers with pagination
    const customers = await Customer.find(searchQuery)
      .populate('retailerId', 'basicInfo.fullName basicInfo.shopName basicInfo.mobileNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Format response
    const formattedCustomers = customers.map(customer => ({
      id: customer._id.toString(),
      fullName: customer.fullName,
      mobileNumber: customer.mobileNumber,
      mobileVerified: customer.mobileVerified,
      aadharNumber: customer.aadharNumber,
      dob: customer.dob,
      imei1: customer.imei1,
      imei2: customer.imei2,
      fatherName: customer.fatherName,
      address: customer.address,
      documents: customer.documents,
      emiDetails: customer.emiDetails,
      retailer: customer.retailerId ? {
        id: customer.retailerId._id?.toString(),
        name: customer.retailerId.basicInfo?.fullName,
        shopName: customer.retailerId.basicInfo?.shopName,
        mobile: customer.retailerId.basicInfo?.mobileNumber
      } : null,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    }));

    const totalPages = Math.ceil(totalCustomers / limitNum);

    return res.status(200).json({
      success: true,
      message: 'Customers fetched successfully',
      data: {
        customers: formattedCustomers,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalCustomers,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all customers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  sendOtpController,
  verifyOtpController,
  sendOtpValidation,
  verifyOtpValidation,
  getAllCustomers
};
