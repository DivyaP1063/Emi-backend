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
      isLocked: customer.isLocked,
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

/**
 * Update EMI Payment Status (Admin only)
 */
const updateEmiPaymentStatus = async (req, res) => {
  try {
    const { customerId, monthNumber } = req.params;
    const { paid, paidDate } = req.body;

    // Validate required fields
    if (typeof paid !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Paid status is required and must be a boolean',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate customerId format
    if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format',
        error: 'VALIDATION_ERROR'
      });
    }

    // Get customer
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: 'CUSTOMER_NOT_FOUND'
      });
    }

    // Validate month number
    const month = parseInt(monthNumber);
    if (isNaN(month) || month < 1 || month > customer.emiDetails.numberOfMonths) {
      return res.status(400).json({
        success: false,
        message: `Invalid month number. Must be between 1 and ${customer.emiDetails.numberOfMonths}`,
        error: 'INVALID_MONTH_NUMBER'
      });
    }

    // Find the EMI month
    const emiMonth = customer.emiDetails.emiMonths.find(m => m.month === month);

    if (!emiMonth) {
      return res.status(404).json({
        success: false,
        message: `EMI month ${month} not found`,
        error: 'EMI_MONTH_NOT_FOUND'
      });
    }

    // Update payment status
    emiMonth.paid = paid;

    if (paid) {
      // If marking as paid, set paidDate (use provided date or current date)
      emiMonth.paidDate = paidDate ? new Date(paidDate) : new Date();
    } else {
      // If marking as pending, remove paidDate
      emiMonth.paidDate = undefined;
    }

    // Save customer
    await customer.save();

    return res.status(200).json({
      success: true,
      message: `EMI month ${month} marked as ${paid ? 'paid' : 'pending'}`,
      data: {
        customerId: customer._id.toString(),
        customerName: customer.fullName,
        monthNumber: month,
        paid: emiMonth.paid,
        paidDate: emiMonth.paidDate,
        amount: emiMonth.amount,
        emiDetails: customer.emiDetails
      }
    });
  } catch (error) {
    console.error('Update EMI payment status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update EMI payment status',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Toggle Customer Lock Status (Admin only)
 */
const toggleCustomerLock = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { isLocked } = req.body;

    // Validate required fields
    if (typeof isLocked !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isLocked status is required and must be a boolean',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate customerId format
    if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format',
        error: 'VALIDATION_ERROR'
      });
    }

    // Get customer
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: 'CUSTOMER_NOT_FOUND'
      });
    }

    // Update lock status
    customer.isLocked = isLocked;
    await customer.save();

    return res.status(200).json({
      success: true,
      message: `Customer ${isLocked ? 'locked' : 'unlocked'} successfully`,
      data: {
        customerId: customer._id.toString(),
        customerName: customer.fullName,
        isLocked: customer.isLocked,
        updatedAt: customer.updatedAt
      }
    });
  } catch (error) {
    console.error('Toggle customer lock error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update customer lock status',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Get IMEI numbers of all locked customers (Admin only)
 */
const getLockedCustomersImei = async (req, res) => {
  try {
    const Customer = require('../models/Customer');

    // Find all locked customers
    const lockedCustomers = await Customer.find({ isLocked: true })
      .select('fullName mobileNumber imei1 imei2 retailerId createdAt')
      .populate('retailerId', 'fullName shopName mobileNumber')
      .sort({ createdAt: -1 })
      .lean();

    // Format response with IMEI details
    const imeiList = lockedCustomers.map(customer => {
      const imeis = [customer.imei1];
      if (customer.imei2) {
        imeis.push(customer.imei2);
      }

      return {
        customerId: customer._id.toString(),
        customerName: customer.fullName,
        mobileNumber: customer.mobileNumber,
        imei1: customer.imei1,
        imei2: customer.imei2 || null,
        totalImeis: imeis.length,
        imeis: imeis,
        retailer: customer.retailerId ? {
          id: customer.retailerId._id?.toString(),
          name: customer.retailerId.fullName,
          shopName: customer.retailerId.shopName,
          mobile: customer.retailerId.mobileNumber
        } : null,
        lockedSince: customer.createdAt
      };
    });

    // Collect all IMEIs in a flat array
    const allImeis = lockedCustomers.reduce((acc, customer) => {
      acc.push(customer.imei1);
      if (customer.imei2) {
        acc.push(customer.imei2);
      }
      return acc;
    }, []);

    return res.status(200).json({
      success: true,
      message: 'Locked customers IMEI fetched successfully',
      data: {
        totalLockedCustomers: lockedCustomers.length,
        totalImeis: allImeis.length,
        allImeis: allImeis,
        customers: imeiList
      }
    });
  } catch (error) {
    console.error('Get locked customers IMEI error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch locked customers IMEI',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Get all customers with pending EMI payments (Admin only)
 */
const getPendingEmiCustomersAdmin = async (req, res) => {
  try {
    const Customer = require('../models/Customer');
    const mongoose = require('mongoose');
    const { page = 1, limit = 20, search = '' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build base query
    let matchQuery = {};

    // Add search filter if provided
    if (search) {
      matchQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { aadharNumber: { $regex: search, $options: 'i' } },
        { imei1: { $regex: search, $options: 'i' } },
        { imei2: { $regex: search, $options: 'i' } }
      ];
    }

    const currentDate = new Date();

    // Aggregate to find customers with pending EMIs
    const customers = await Customer.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          pendingEmis: {
            $filter: {
              input: '$emiDetails.emiMonths',
              as: 'emi',
              cond: {
                $and: [
                  { $eq: ['$$emi.paid', false] },
                  { $lt: ['$$emi.dueDate', currentDate] }
                ]
              }
            }
          }
        }
      },
      {
        $match: {
          'pendingEmis.0': { $exists: true } // Only customers with at least one pending EMI
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'retailers',
          localField: 'retailerId',
          foreignField: '_id',
          as: 'retailer'
        }
      },
      { $unwind: { path: '$retailer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          aadharNumber: 1,
          dob: 1,
          imei1: 1,
          imei2: 1,
          fatherName: 1,
          address: 1,
          documents: 1,
          isLocked: 1,
          'emiDetails.branch': 1,
          'emiDetails.phoneType': 1,
          'emiDetails.model': 1,
          'emiDetails.productName': 1,
          'emiDetails.emiPerMonth': 1,
          'emiDetails.numberOfMonths': 1,
          pendingEmis: 1,
          retailer: {
            id: '$retailer._id',
            fullName: '$retailer.fullName',
            shopName: '$retailer.shopName',
            mobileNumber: '$retailer.mobileNumber',
            email: '$retailer.email'
          },
          createdAt: 1
        }
      }
    ]);

    // Get total count
    const totalCountResult = await Customer.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          pendingEmis: {
            $filter: {
              input: '$emiDetails.emiMonths',
              as: 'emi',
              cond: {
                $and: [
                  { $eq: ['$$emi.paid', false] },
                  { $lt: ['$$emi.dueDate', currentDate] }
                ]
              }
            }
          }
        }
      },
      {
        $match: {
          'pendingEmis.0': { $exists: true }
        }
      },
      { $count: 'total' }
    ]);

    const totalItems = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
    const totalPages = Math.ceil(totalItems / limitNum);

    return res.status(200).json({
      success: true,
      message: 'Pending EMI customers fetched successfully',
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
          documents: c.documents,
          isLocked: c.isLocked,
          emiDetails: {
            branch: c.emiDetails.branch,
            phoneType: c.emiDetails.phoneType,
            model: c.emiDetails.model,
            productName: c.emiDetails.productName,
            emiPerMonth: c.emiDetails.emiPerMonth,
            numberOfMonths: c.emiDetails.numberOfMonths
          },
          pendingEmis: c.pendingEmis,
          retailer: c.retailer.id ? {
            id: c.retailer.id.toString(),
            fullName: c.retailer.fullName,
            shopName: c.retailer.shopName,
            mobileNumber: c.retailer.mobileNumber,
            email: c.retailer.email
          } : null,
          createdAt: c.createdAt
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get pending EMI customers (admin) error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pending EMI customers',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Get EMI Statistics for all customers (Admin only)
 */
const getEmiStatisticsAdmin = async (req, res) => {
  try {
    const Customer = require('../models/Customer');

    // Get total customers count
    const totalCustomers = await Customer.countDocuments({});

    if (totalCustomers === 0) {
      return res.status(200).json({
        success: true,
        message: 'No customers found',
        data: {
          totalEmiAmount: 0,
          totalPaidAmount: 0,
          totalPendingAmount: 0,
          totalCustomers: 0,
          customersWithPending: 0,
          customersFullyPaid: 0,
          paymentPercentage: 0
        }
      });
    }

    // Aggregate EMI statistics
    const statistics = await Customer.aggregate([
      // Unwind EMI months to calculate paid/pending per EMI
      { $unwind: '$emiDetails.emiMonths' },

      // Group and calculate totals
      {
        $group: {
          _id: null,
          totalPaid: {
            $sum: {
              $cond: [
                { $eq: ['$emiDetails.emiMonths.paid', true] },
                '$emiDetails.emiMonths.amount',
                0
              ]
            }
          },
          totalPending: {
            $sum: {
              $cond: [
                { $eq: ['$emiDetails.emiMonths.paid', false] },
                '$emiDetails.emiMonths.amount',
                0
              ]
            }
          }
        }
      }
    ]);

    // Get customers with all EMIs paid
    const customersFullyPaid = await Customer.countDocuments({
      'emiDetails.emiMonths': {
        $not: {
          $elemMatch: { paid: false }
        }
      }
    });

    // Get customers with at least one pending EMI
    const customersWithPending = await Customer.countDocuments({
      'emiDetails.emiMonths': {
        $elemMatch: { paid: false }
      }
    });

    const stats = statistics[0] || { totalPaid: 0, totalPending: 0 };
    const totalEmiAmount = stats.totalPaid + stats.totalPending;
    const paymentPercentage = totalEmiAmount > 0
      ? Math.round((stats.totalPaid / totalEmiAmount) * 100 * 100) / 100
      : 0;

    return res.status(200).json({
      success: true,
      message: 'EMI statistics fetched successfully',
      data: {
        totalEmiAmount: Math.round(totalEmiAmount * 100) / 100,
        totalPaidAmount: Math.round(stats.totalPaid * 100) / 100,
        totalPendingAmount: Math.round(stats.totalPending * 100) / 100,
        totalCustomers,
        customersWithPending,
        customersFullyPaid,
        paymentPercentage
      }
    });
  } catch (error) {
    console.error('Get EMI statistics (admin) error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch EMI statistics',
      error: 'SERVER_ERROR'
    });
  }
};


/**
 * Get customer count statistics (Admin only)
 */
const getCustomerCountAdmin = async (req, res) => {
  try {
    const Customer = require('../models/Customer');

    // Get total customers count
    const totalCustomers = await Customer.countDocuments({});

    // Get locked customers count
    const lockedCustomers = await Customer.countDocuments({ isLocked: true });

    return res.status(200).json({
      success: true,
      message: 'Customer count fetched successfully',
      data: {
        totalCustomers,
        lockedCustomers,
        activeCustomers: totalCustomers - lockedCustomers
      }
    });
  } catch (error) {
    console.error('Get customer count (admin) error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer count',
      error: 'SERVER_ERROR'
    });
  }
};


module.exports = {
  sendOtpController,
  verifyOtpController,
  sendOtpValidation,
  verifyOtpValidation,
  getAllCustomers,
  updateEmiPaymentStatus,
  toggleCustomerLock,
  getLockedCustomersImei,
  getPendingEmiCustomersAdmin,
  getEmiStatisticsAdmin,
  getCustomerCountAdmin
};

