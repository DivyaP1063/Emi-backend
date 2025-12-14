const { body, validationResult } = require('express-validator');
const Retailer = require('../models/Retailer');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { sendOTP, verifyOTP } = require('../utils/otpService');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

/**
 * Send OTP to customer mobile number
 */
const sendCustomerOTP = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber || !/^[0-9]{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be exactly 10 digits',
        error: 'VALIDATION_ERROR'
      });
    }

    // Send OTP
    await sendOTP(mobileNumber);

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
 * Verify customer mobile OTP (required before proceeding to next form step)
 */
const verifyCustomerOTP = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !/^[0-9]{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be exactly 10 digits',
        error: 'VALIDATION_ERROR'
      });
    }

    if (!otp || !/^[0-9]{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be exactly 6 digits',
        error: 'VALIDATION_ERROR'
      });
    }

    // Verify OTP with Twilio
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
      message: 'Mobile number verified successfully. You can proceed to next step.',
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
 * Create customer with all details, IMEI, and document uploads
 * Note: Mobile number should already be verified via verify-otp endpoint
 */
const createCustomer = async (req, res) => {
  try {
    // Validate files
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
        error: 'NO_FILES'
      });
    }

    const { customerPhoto, aadharFront, aadharBack, signature } = req.files;

    if (!customerPhoto || !aadharFront || !aadharBack || !signature) {
      return res.status(400).json({
        success: false,
        message: 'All documents are required: customerPhoto, aadharFront, aadharBack, signature',
        error: 'MISSING_DOCUMENTS',
        debug: {
          receivedFiles: Object.keys(req.files)
        }
      });
    }

    // Extract all data from form fields
    const {
      fullName, aadharNumber, dob, pincode, imei1, imei2,
      mobileNumber,
      fatherName, village, nearbyLocation, post, district
    } = req.body;

    // Validate required fields
    const validationErrors = {};
    
    if (!fullName || !fullName.trim()) validationErrors.fullName = 'Full name is required';
    if (!aadharNumber || !/^[0-9]{12}$/.test(aadharNumber)) validationErrors.aadharNumber = 'Aadhar number must be exactly 12 digits';
    if (!dob) validationErrors.dob = 'Date of birth is required';
    if (!pincode || !/^[0-9]{6}$/.test(pincode)) validationErrors.pincode = 'Pincode must be exactly 6 digits';
    if (!imei1 || !/^[0-9]{15}$/.test(imei1)) validationErrors.imei1 = 'IMEI 1 must be exactly 15 digits';
    if (imei2 && !/^[0-9]{15}$/.test(imei2)) validationErrors.imei2 = 'IMEI 2 must be exactly 15 digits';
    if (!mobileNumber || !/^[0-9]{10}$/.test(mobileNumber)) validationErrors.mobileNumber = 'Mobile number must be exactly 10 digits';
    if (!fatherName || !fatherName.trim()) validationErrors.fatherName = 'Father name is required';
    if (!village || !village.trim()) validationErrors.village = 'Village is required';
    if (!nearbyLocation || !nearbyLocation.trim()) validationErrors.nearbyLocation = 'Nearby location is required';
    if (!post || !post.trim()) validationErrors.post = 'Post is required';
    if (!district || !district.trim()) validationErrors.district = 'District is required';

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // Check duplicate IMEI1
    const existingCustomer1 = await Customer.findOne({ imei1 });
    if (existingCustomer1) {
      return res.status(400).json({
        success: false,
        message: 'IMEI 1 already exists in the system',
        error: 'DUPLICATE_IMEI1'
      });
    }

    // Check duplicate IMEI2 if provided
    if (imei2) {
      const existingCustomer2 = await Customer.findOne({
        $or: [{ imei1: imei2 }, { imei2: imei2 }]
      });
      if (existingCustomer2) {
        return res.status(400).json({
          success: false,
          message: 'IMEI 2 already exists in the system',
          error: 'DUPLICATE_IMEI2'
        });
      }
    }

    // Check duplicate Aadhar
    const existingAadhar = await Customer.findOne({ aadharNumber });
    if (existingAadhar) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this Aadhar number already exists',
        error: 'DUPLICATE_AADHAR'
      });
    }

    const retailerId = req.retailer.id;

    // Upload documents to Cloudinary
    const uploadResults = await Promise.all([
      uploadToCloudinary(customerPhoto[0].buffer, 'customers'),
      uploadToCloudinary(aadharFront[0].buffer, 'documents/aadhar'),
      uploadToCloudinary(aadharBack[0].buffer, 'documents/aadhar'),
      uploadToCloudinary(signature[0].buffer, 'documents/signatures')
    ]);

    const [customerPhotoUrl, aadharFrontUrl, aadharBackUrl, signatureUrl] = uploadResults.map(r => r.secure_url);

    // Create customer with IMEI information
    const customer = await Customer.create({
      fullName,
      aadharNumber,
      dob,
      mobileNumber,
      mobileVerified: true,
      imei1,
      imei2: imei2 || undefined,
      fatherName,
      address: {
        village,
        nearbyLocation,
        post,
        district,
        pincode
      },
      documents: {
        customerPhoto: customerPhotoUrl,
        aadharFrontPhoto: aadharFrontUrl,
        aadharBackPhoto: aadharBackUrl,
        signaturePhoto: signatureUrl
      },
      retailerId
    });

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully with device information',
      data: {
        customerId: customer._id.toString(),
        customer: {
          fullName: customer.fullName,
          mobileNumber: customer.mobileNumber,
          aadharNumber: customer.aadharNumber,
          dob: customer.dob,
          fatherName: customer.fatherName,
          address: customer.address,
          imei1: customer.imei1,
          imei2: customer.imei2 || null
        },
        documents: customer.documents,
        createdAt: customer.createdAt
      }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Get all customers for a retailer
 */
const getCustomers = async (req, res) => {
  try {
    const retailerId = req.retailer.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const skip = (page - 1) * limit;

    // Build query
    let query = { retailerId };

    // Add search filter
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { aadharNumber: { $regex: search, $options: 'i' } },
        { imei1: { $regex: search, $options: 'i' } },
        { imei2: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const totalItems = await Customer.countDocuments(query);

    // Get customers
    const customers = await Customer.find(query)
      .select('-documents') // Exclude document URLs for list view
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      success: true,
      message: 'Customers fetched successfully',
      data: {
        customers: customers.map(c => ({
          id: c._id.toString(),
          fullName: c.fullName,
          mobileNumber: c.mobileNumber,
          aadharNumber: c.aadharNumber,
          dob: c.dob,
          imei1: c.imei1,
          imei2: c.imei2,
          fatherName: c.fatherName,
          address: c.address,
          mobileVerified: c.mobileVerified,
          createdAt: c.createdAt
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
    console.error('Get customers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  sendCustomerOTP,
  verifyCustomerOTP,
  createCustomer,
  getCustomers
};