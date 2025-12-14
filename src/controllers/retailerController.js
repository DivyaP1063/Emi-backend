const { body, validationResult, query } = require('express-validator');
const Retailer = require('../models/Retailer');

/**
 * Validation rules for create retailer
 */
const createRetailerValidation = [
  // Basic Info
  body('basicInfo.fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2 })
    .withMessage('Full name must be at least 2 characters'),
  body('basicInfo.email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('basicInfo.mobileNumber')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be exactly 10 digits'),
  body('basicInfo.shopName')
    .trim()
    .notEmpty()
    .withMessage('Shop name is required'),

  // Address
  body('address.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  body('address.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('address.address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),

  // Permissions
  body('permissions.canPayEmiDownPayment')
    .isBoolean()
    .withMessage('canPayEmiDownPayment must be a boolean'),
  body('permissions.dpPending')
    .isBoolean()
    .withMessage('dpPending must be a boolean'),
  body('permissions.autoLockDay')
    .isInt({ min: 1 })
    .withMessage('autoLockDay must be a positive integer'),
  body('permissions.serverAadharVerify')
    .isBoolean()
    .withMessage('serverAadharVerify must be a boolean'),
  body('permissions.allowElectronic')
    .isBoolean()
    .withMessage('allowElectronic must be a boolean'),
  body('permissions.allowIPhone')
    .isBoolean()
    .withMessage('allowIPhone must be a boolean'),
  body('permissions.allow8Month')
    .isBoolean()
    .withMessage('allow8Month must be a boolean'),
  body('permissions.allow4Month')
    .isBoolean()
    .withMessage('allow4Month must be a boolean')
];

/**
 * Create new retailer
 */
const createRetailer = async (req, res) => {
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

    const { basicInfo, address, permissions } = req.body;

    // Check if mobile number already exists
    const existingMobile = await Retailer.findOne({ 
      mobileNumber: basicInfo.mobileNumber 
    });

    if (existingMobile) {
      return res.status(409).json({
        success: false,
        message: 'Retailer with this mobile number already exists',
        error: 'DUPLICATE_MOBILE'
      });
    }

    // Check if email already exists
    const existingEmail = await Retailer.findOne({ 
      email: basicInfo.email 
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Retailer with this email already exists',
        error: 'DUPLICATE_EMAIL'
      });
    }

    // Create retailer
    const retailer = await Retailer.create({
      fullName: basicInfo.fullName,
      email: basicInfo.email,
      mobileNumber: basicInfo.mobileNumber,
      shopName: basicInfo.shopName,
      address,
      permissions,
      status: 'ACTIVE'
    });

    return res.status(201).json({
      success: true,
      message: 'Retailer created successfully',
      data: {
        retailerId: retailer._id.toString(),
        fullName: retailer.fullName,
        email: retailer.email,
        mobileNumber: retailer.mobileNumber,
        shopName: retailer.shopName,
        status: retailer.status,
        createdAt: retailer.createdAt
      }
    });
  } catch (error) {
    console.error('Create retailer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create retailer',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Get all retailers with pagination and filters
 */
const getAllRetailers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status;

    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    // Add search filter
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { shopName: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      query.status = status;
    }

    // Get total count
    const totalItems = await Retailer.countDocuments(query);

    // Get retailers
    const retailers = await Retailer.find(query)
      .select('fullName email mobileNumber shopName address.city address.state status createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      success: true,
      message: 'Retailers fetched successfully',
      data: {
        retailers: retailers.map(retailer => ({
          retailerId: retailer._id.toString(),
          fullName: retailer.fullName,
          email: retailer.email,
          mobileNumber: retailer.mobileNumber,
          shopName: retailer.shopName,
          city: retailer.address.city,
          state: retailer.address.state,
          status: retailer.status,
          createdAt: retailer.createdAt
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get retailers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch retailers',
      error: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  createRetailer,
  getAllRetailers,
  createRetailerValidation
};
