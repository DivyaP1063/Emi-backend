const { body, validationResult } = require('express-validator');
const Retailer = require('../models/Retailer');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { sendOTP, verifyOTP } = require('../utils/otpService');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

/**
 * Step 1: Validate customer basic details and IMEI
 * Validation rules for step 1
 */
const validateStep1 = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('aadharNumber')
    .trim()
    .matches(/^[0-9]{12}$/)
    .withMessage('Aadhar number must be exactly 12 digits'),
  body('dob')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Date of birth must be in YYYY-MM-DD format'),
  body('pincode')
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('Pincode must be exactly 6 digits'),
  body('imei1')
    .trim()
    .matches(/^[0-9]{15}$/)
    .withMessage('IMEI 1 must be exactly 15 digits'),
  body('imei2')
    .optional()
    .trim()
    .matches(/^[0-9]{15}$/)
    .withMessage('IMEI 2 must be exactly 15 digits')
];

/**
 * Step 1 Controller: Basic customer details
 */
const addProductStep1 = async (req, res) => {
  try {
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

    const { fullName, aadharNumber, dob, pincode, imei1, imei2 } = req.body;

    // Check duplicate IMEI1
    const existingProduct1 = await Product.findOne({ imei1 });
    if (existingProduct1) {
      return res.status(400).json({
        success: false,
        message: 'IMEI 1 already exists in the system',
        error: 'DUPLICATE_IMEI1'
      });
    }

    // Check duplicate IMEI2 if provided
    if (imei2) {
      const existingProduct2 = await Product.findOne({
        $or: [{ imei1: imei2 }, { imei2: imei2 }]
      });
      if (existingProduct2) {
        return res.status(400).json({
          success: false,
          message: 'IMEI 2 already exists in the system',
          error: 'DUPLICATE_IMEI2'
        });
      }
    }

    // Check duplicate Aadhar
    const existingCustomer = await Customer.findOne({ aadharNumber });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this Aadhar number already exists',
        error: 'DUPLICATE_AADHAR'
      });
    }

    // Return success - data will be stored temporarily in frontend
    return res.status(200).json({
      success: true,
      message: 'Step 1 validated successfully. Proceed to mobile verification.',
      data: {
        fullName,
        aadharNumber,
        dob,
        pincode,
        imei1,
        imei2
      }
    });
  } catch (error) {
    console.error('Step 1 error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate customer details',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Step 2: Send OTP to mobile number
 */
const addProductStep2SendOTP = [
  body('mobileNumber')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be exactly 10 digits')
];

const sendMobileOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        details: { mobileNumber: errors.array()[0].msg }
      });
    }

    const { mobileNumber } = req.body;

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
 * Step 2: Verify mobile OTP
 */
const addProductStep2VerifyOTP = [
  body('mobileNumber')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be exactly 10 digits'),
  body('otp')
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('OTP must be exactly 6 digits')
];

const verifyMobileOTP = async (req, res) => {
  try {
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

    const { mobileNumber, otp } = req.body;

    // Verify OTP
    const isValid = await verifyOTP(mobileNumber, otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
        error: 'INVALID_OTP'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Mobile number verified successfully. Proceed to address details.',
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
 * Step 3: Address details validation
 */
const validateStep3 = [
  body('fatherName')
    .trim()
    .notEmpty()
    .withMessage('Father name is required'),
  body('village')
    .trim()
    .notEmpty()
    .withMessage('Village is required'),
  body('nearbyLocation')
    .trim()
    .notEmpty()
    .withMessage('Nearby location is required'),
  body('post')
    .trim()
    .notEmpty()
    .withMessage('Post is required'),
  body('district')
    .trim()
    .notEmpty()
    .withMessage('District is required')
];

const addProductStep3 = async (req, res) => {
  try {
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

    const { fatherName, village, nearbyLocation, post, district } = req.body;

    return res.status(200).json({
      success: true,
      message: 'Address details validated. Proceed to document upload.',
      data: {
        fatherName,
        village,
        nearbyLocation,
        post,
        district
      }
    });
  } catch (error) {
    console.error('Step 3 error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate address details',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Step 4: Final submission with document uploads
 */
const addProductFinal = async (req, res) => {
  try {
    // Check if files are uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
        error: 'NO_FILES'
      });
    }

    const { customerPhoto, aadharFront, aadharBack, signature } = req.files;

    // Validate required files
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

    // Extract data from individual form fields (only what was collected in steps 1-3)
    const {
      // Step 1
      fullName, aadharNumber, dob, pincode, imei1, imei2,
      // Step 2
      mobileNumber,
      // Step 3
      fatherName, village, nearbyLocation, post, district
    } = req.body;

    // Validate required fields from the 4-step flow
    if (!fullName || !aadharNumber || !dob || !pincode || !imei1) {
      return res.status(400).json({
        success: false,
        message: 'Missing required customer fields',
        error: 'VALIDATION_ERROR',
        details: 'fullName, aadharNumber, dob, pincode, and imei1 are required'
      });
    }

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required',
        error: 'VALIDATION_ERROR'
      });
    }

    if (!fatherName || !village || !nearbyLocation || !post || !district) {
      return res.status(400).json({
        success: false,
        message: 'Missing required address fields',
        error: 'VALIDATION_ERROR',
        details: 'fatherName, village, nearbyLocation, post, and district are required'
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
          imei1,
          imei2: imei2 || null
        },
        documents: customer.documents,
        createdAt: customer.createdAt
      }
    });
  } catch (error) {
    console.error('Final submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add product',
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
  addProductStep1,
  validateStep1,
  sendMobileOTP,
  addProductStep2SendOTP,
  verifyMobileOTP,
  addProductStep2VerifyOTP,
  addProductStep3,
  validateStep3,
  addProductFinal,
  getCustomers
};
