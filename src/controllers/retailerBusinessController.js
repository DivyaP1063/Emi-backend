const { body, validationResult } = require('express-validator');
const Retailer = require('../models/Retailer');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

/**
 * Get retailer permissions
 */
const getPermissions = async (req, res) => {
  try {
    const retailerId = req.retailer.id;

    const retailer = await Retailer.findById(retailerId).select('permissions');

    if (!retailer) {
      return res.status(404).json({
        success: false,
        message: 'Retailer not found',
        error: 'NOT_FOUND'
      });
    }

    // Calculate allowed EMI months based on permissions
    const allowedEmiMonths = [];
    if (retailer.permissions.allow4Month) {
      allowedEmiMonths.push(4);
    }
    if (retailer.permissions.allow8Month) {
      allowedEmiMonths.push(8);
    }

    return res.status(200).json({
      success: true,
      message: 'Permissions fetched successfully',
      data: {
        retailerId: retailerId,
        permissions: retailer.permissions,
        allowedEmiMonths
      }
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Validation rules for add product
 */
const addProductValidation = [
  // Customer Details
  body('customerDetails.fullName')
    .trim()
    .notEmpty()
    .withMessage('Customer full name is required'),
  body('customerDetails.mobileNumber')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be exactly 10 digits'),
  body('customerDetails.email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('customerDetails.aadharNumber')
    .optional()
    .trim()
    .matches(/^[0-9]{12}$/)
    .withMessage('Aadhar number must be exactly 12 digits'),
  body('customerDetails.dob')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Date of birth must be in YYYY-MM-DD format'),
  body('customerDetails.address.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('customerDetails.address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('customerDetails.address.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('customerDetails.address.pincode')
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('Pincode must be exactly 6 digits'),

  // Product Details
  body('productDetails.productType')
    .trim()
    .isIn(['ELECTRONIC', 'IPHONE', 'OTHER'])
    .withMessage('Invalid product type'),
  body('productDetails.productName')
    .trim()
    .notEmpty()
    .withMessage('Product name is required'),
  body('productDetails.brand')
    .trim()
    .notEmpty()
    .withMessage('Brand is required'),
  body('productDetails.model')
    .trim()
    .notEmpty()
    .withMessage('Model is required'),
  body('productDetails.imei')
    .optional()
    .trim()
    .matches(/^[0-9]{15}$/)
    .withMessage('IMEI must be exactly 15 digits'),
  body('productDetails.price')
    .isFloat({ min: 1 })
    .withMessage('Price must be a positive number'),

  // EMI Details
  body('emiDetails.emiMonth')
    .isInt({ min: 1 })
    .withMessage('EMI month must be a positive integer'),
  body('emiDetails.downPayment')
    .isFloat({ min: 0 })
    .withMessage('Down payment must be a non-negative number'),
  body('emiDetails.emiAmount')
    .isFloat({ min: 1 })
    .withMessage('EMI amount must be a positive number'),
  body('emiDetails.totalAmount')
    .isFloat({ min: 1 })
    .withMessage('Total amount must be a positive number'),
  body('emiDetails.startDate')
    .isISO8601()
    .withMessage('Start date must be in YYYY-MM-DD format')
];

/**
 * Generate EMI schedule
 */
const generateEmiSchedule = (emiMonth, emiAmount, startDate) => {
  const schedule = [];
  const start = new Date(startDate);

  for (let i = 1; i <= emiMonth; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      installmentNumber: i,
      dueDate,
      amount: emiAmount,
      status: 'PENDING'
    });
  }

  return schedule;
};

/**
 * Generate unique transaction ID
 */
const generateTransactionId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `TXN_${timestamp}${random}`.toUpperCase();
};

/**
 * Add product/transaction
 */
const addProduct = async (req, res) => {
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

    const retailerId = req.retailer.id;
    const { customerDetails, productDetails, emiDetails } = req.body;

    // Get retailer permissions
    const retailer = await Retailer.findById(retailerId);

    if (!retailer) {
      return res.status(404).json({
        success: false,
        message: 'Retailer not found',
        error: 'NOT_FOUND'
      });
    }

    // Validate Aadhar if serverAadharVerify is enabled
    if (retailer.permissions.serverAadharVerify && !customerDetails.aadharNumber) {
      return res.status(400).json({
        success: false,
        message: 'Aadhar number is required',
        error: 'VALIDATION_ERROR',
        details: {
          aadharNumber: 'Aadhar number is required when Aadhar verification is enabled'
        }
      });
    }

    // Validate product type permissions
    if (productDetails.productType === 'IPHONE' && !retailer.permissions.allowIPhone) {
      return res.status(400).json({
        success: false,
        message: 'iPhone products are not allowed for this retailer',
        error: 'PRODUCT_TYPE_NOT_ALLOWED'
      });
    }

    if (productDetails.productType === 'ELECTRONIC' && !retailer.permissions.allowElectronic) {
      return res.status(400).json({
        success: false,
        message: 'Electronic products are not allowed for this retailer',
        error: 'PRODUCT_TYPE_NOT_ALLOWED'
      });
    }

    // Validate EMI month permissions
    const allowedEmiMonths = [];
    if (retailer.permissions.allow4Month) allowedEmiMonths.push(4);
    if (retailer.permissions.allow8Month) allowedEmiMonths.push(8);

    if (!allowedEmiMonths.includes(emiDetails.emiMonth)) {
      return res.status(400).json({
        success: false,
        message: `${emiDetails.emiMonth}-month EMI plan is not allowed for this retailer`,
        error: 'INVALID_EMI_MONTH',
        details: {
          allowedMonths: allowedEmiMonths
        }
      });
    }

    // Validate IMEI for phones
    if (['ELECTRONIC', 'IPHONE'].includes(productDetails.productType) && !productDetails.imei) {
      return res.status(400).json({
        success: false,
        message: 'IMEI number is required for phone products',
        error: 'VALIDATION_ERROR',
        details: {
          imei: 'IMEI number is required'
        }
      });
    }

    // Check duplicate IMEI
    if (productDetails.imei) {
      const existingProduct = await Product.findOne({ imei: productDetails.imei });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'IMEI number already exists in the system',
          error: 'DUPLICATE_IMEI'
        });
      }
    }

    // Validate EMI calculation
    const calculatedTotal = emiDetails.downPayment + (emiDetails.emiAmount * emiDetails.emiMonth);
    if (Math.abs(calculatedTotal - emiDetails.totalAmount) > 1) { // Allow 1 rupee difference for rounding
      return res.status(400).json({
        success: false,
        message: 'EMI calculation is incorrect',
        error: 'VALIDATION_ERROR',
        details: {
          message: `Down payment (${emiDetails.downPayment}) + (EMI amount (${emiDetails.emiAmount}) × ${emiDetails.emiMonth} months) should equal total amount (${emiDetails.totalAmount})`
        }
      });
    }

    // Create customer
    const customer = await Customer.create({
      fullName: customerDetails.fullName,
      mobileNumber: customerDetails.mobileNumber,
      email: customerDetails.email,
      aadharNumber: customerDetails.aadharNumber,
      dob: customerDetails.dob,
      address: customerDetails.address,
      retailerId
    });

    // Create product
    const product = await Product.create({
      productType: productDetails.productType,
      productName: productDetails.productName,
      brand: productDetails.brand,
      model: productDetails.model,
      imei: productDetails.imei,
      serialNumber: productDetails.serialNumber,
      price: productDetails.price,
      description: productDetails.description,
      retailerId
    });

    // Generate EMI schedule
    const emiSchedule = generateEmiSchedule(
      emiDetails.emiMonth,
      emiDetails.emiAmount,
      emiDetails.startDate
    );

    // Create transaction
    const transaction = await Transaction.create({
      transactionId: generateTransactionId(),
      retailerId,
      customerId: customer._id,
      productId: product._id,
      emiDetails: {
        emiMonth: emiDetails.emiMonth,
        downPayment: emiDetails.downPayment,
        emiAmount: emiDetails.emiAmount,
        totalAmount: emiDetails.totalAmount,
        startDate: emiDetails.startDate
      },
      emiSchedule,
      status: 'ACTIVE'
    });

    return res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: {
        transactionId: transaction.transactionId,
        productId: product._id.toString(),
        customerId: customer._id.toString(),
        emiSchedule: transaction.emiSchedule.map(installment => ({
          installmentNumber: installment.installmentNumber,
          dueDate: installment.dueDate,
          amount: installment.amount,
          status: installment.status
        })),
        createdAt: transaction.createdAt
      }
    });
  } catch (error) {
    console.error('Add product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add product',
      error: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  getPermissions,
  addProduct,
  addProductValidation
};
