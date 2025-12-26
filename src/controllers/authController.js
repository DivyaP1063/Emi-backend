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
      .populate('retailerId', 'fullName shopName mobileNumber email address status')
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
        fullName: customer.retailerId.fullName,
        shopName: customer.retailerId.shopName,
        mobileNumber: customer.retailerId.mobileNumber,
        email: customer.retailerId.email,
        address: customer.retailerId.address,
        status: customer.retailerId.status
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
 * Sends FCM notification to device for payment-related lock/unlock
 * FCM token is REQUIRED - no fallback
 */
const toggleCustomerLock = async (req, res) => {
  try {
    console.log('\n🔐 ===== CUSTOMER LOCK/UNLOCK REQUEST =====');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Customer ID:', req.params.customerId);
    console.log('Requested Lock Status:', req.body.isLocked);

    const { customerId } = req.params;
    const { isLocked } = req.body;

    // Validate required fields
    if (typeof isLocked !== 'boolean') {
      console.log('❌ Validation error: isLocked must be boolean');
      return res.status(400).json({
        success: false,
        message: 'isLocked status is required and must be a boolean',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate customerId format
    if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('❌ Validation error: Invalid customer ID format');
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
      console.log('❌ Customer not found with ID:', customerId);
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: 'CUSTOMER_NOT_FOUND'
      });
    }

    console.log('✅ Customer found:', customer.fullName);
    console.log('Current Lock Status:', customer.isLocked);
    console.log('FCM Token:', customer.fcmToken ? 'Present' : 'Missing');

    // Check if FCM token exists - REQUIRED for payment lock/unlock
    if (!customer.fcmToken) {
      console.log('❌ No FCM token - CANNOT lock/unlock device');
      console.log('Device must have app installed with valid FCM token');
      console.log('=========================================\n');

      return res.status(400).json({
        success: false,
        message: `Cannot ${isLocked ? 'lock' : 'unlock'} device. Customer device is not registered.`,
        error: 'NO_FCM_TOKEN',
        data: {
          customerId: customer._id.toString(),
          customerName: customer.fullName,
          currentLockStatus: customer.isLocked,
          hasFcmToken: false
        }
      });
    }

    // Send FCM notification to device
    console.log('📤 Sending Firebase FCM notification...');
    console.log('Action:', isLocked ? 'LOCK_DEVICE' : 'UNLOCK_DEVICE');

    let notificationSent = false;
    let notificationError = null;

    try {
      const { sendLockNotification } = require('../services/firebaseService');
      const fcmResult = await sendLockNotification(customer.fcmToken, isLocked);

      console.log('FCM Result:', JSON.stringify(fcmResult, null, 2));

      if (fcmResult.success) {
        notificationSent = true;
        console.log(`✅ FCM notification sent successfully`);
        console.log('Message ID:', fcmResult.messageId);
        console.log('⏳ Waiting for device confirmation...');
        console.log('Callback: POST /api/customer/device/lock-response');
      } else {
        notificationError = fcmResult.error;
        console.warn(`❌ Failed to send FCM notification`);
        console.warn('Error:', fcmResult.error);
        console.warn('Message:', fcmResult.message);

        // If token is invalid, clear it from database
        if (fcmResult.error === 'INVALID_TOKEN') {
          customer.fcmToken = null;
          await customer.save();
          console.log('🗑️  Cleared invalid FCM token from database');
        }
      }
    } catch (error) {
      console.error('❌ FCM notification exception:', error);
      console.error('Error stack:', error.stack);
      notificationError = error.message;
    }

    console.log('Notification Sent:', notificationSent);
    console.log('Current DB Lock Status:', customer.isLocked);
    console.log('=========================================\n');

    // Return response
    if (notificationSent) {
      return res.status(200).json({
        success: true,
        message: `Lock notification sent to ${customer.fullName} via Firebase FCM. Waiting for device confirmation.`,
        data: {
          customerId: customer._id.toString(),
          customerName: customer.fullName,
          currentLockStatus: customer.isLocked,
          requestedLockStatus: isLocked,
          lockStatusUpdated: false, // Waiting for device callback
          notificationSent: true,
          methodUsed: 'FIREBASE_FCM',
          pendingDeviceConfirmation: true,
          updatedAt: customer.updatedAt
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: `Failed to send lock notification to ${customer.fullName}`,
        error: notificationError || 'FCM_SEND_FAILED',
        data: {
          customerId: customer._id.toString(),
          customerName: customer.fullName,
          currentLockStatus: customer.isLocked,
          requestedLockStatus: isLocked,
          notificationSent: false,
          notificationError
        }
      });
    }
  } catch (error) {
    console.error('❌ Toggle customer lock error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to update customer lock status',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Get Customer Lock Status (Admin only)
 * Check the current lock status of a customer from the database
 */
const getCustomerLockStatus = async (req, res) => {
  try {
    const { customerId } = req.params;

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
    const customer = await Customer.findById(customerId)
      .select('fullName mobileNumber isLocked fcmToken updatedAt')
      .lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: 'CUSTOMER_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer lock status fetched successfully',
      data: {
        customerId: customerId,
        customerName: customer.fullName,
        mobileNumber: customer.mobileNumber,
        isLocked: customer.isLocked,
        hasFcmToken: !!customer.fcmToken,
        lastUpdated: customer.updatedAt
      }
    });
  } catch (error) {
    console.error('Get customer lock status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer lock status',
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
            email: '$retailer.email',
            address: '$retailer.address',
            status: '$retailer.status'
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
            email: c.retailer.email,
            address: c.retailer.address,
            status: c.retailer.status
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
/**
 * Send EMI Reminder Notification (Admin only)
 * Send FCM notification to customer device for pending EMI payment reminder
 */
const sendEmiReminder = async (req, res) => {
  try {
    console.log('\n📢 ===== EMI REMINDER NOTIFICATION REQUEST =====');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request Body:', JSON.stringify(req.body, null, 2));

    const { customerId, imei1, message } = req.body;

    // Validate that either customerId or imei1 is provided
    if (!customerId && !imei1) {
      return res.status(400).json({
        success: false,
        message: 'Either customerId or imei1 is required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Get customer
    const Customer = require('../models/Customer');
    let customer;

    if (customerId) {
      // Validate customerId format
      if (!customerId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID format',
          error: 'VALIDATION_ERROR'
        });
      }
      customer = await Customer.findById(customerId);
    } else {
      // Find by IMEI
      if (!imei1.match(/^[0-9]{15}$/)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid IMEI format. Must be exactly 15 digits',
          error: 'VALIDATION_ERROR'
        });
      }
      customer = await Customer.findOne({ imei1 });
    }

    if (!customer) {
      console.log('❌ Customer not found');
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: 'CUSTOMER_NOT_FOUND'
      });
    }

    console.log('✅ Customer found:', customer.fullName);
    console.log('FCM Token:', customer.fcmToken ? 'Present' : 'Missing');

    // Check if customer has FCM token
    if (!customer.fcmToken) {
      console.log('❌ No FCM token for customer');
      return res.status(400).json({
        success: false,
        message: 'Customer device is not registered. No FCM token available.',
        error: 'NO_FCM_TOKEN'
      });
    }

    // Calculate pending EMI details
    const currentDate = new Date();
    const pendingEmis = customer.emiDetails.emiMonths.filter(
      emi => !emi.paid && new Date(emi.dueDate) < currentDate
    );

    const totalPendingAmount = pendingEmis.reduce((sum, emi) => sum + emi.amount, 0);

    // Prepare notification message
    const notificationTitle = 'EMI Payment Reminder';
    const notificationBody = message ||
      `Dear ${customer.fullName}, you have ${pendingEmis.length} pending EMI payment(s) totaling ₹${totalPendingAmount}. Please pay at the earliest.`;

    console.log('📤 Sending EMI reminder notification...');
    console.log('Title:', notificationTitle);
    console.log('Body:', notificationBody);
    console.log('Pending EMIs:', pendingEmis.length);
    console.log('Total Pending Amount:', totalPendingAmount);

    // Send FCM notification
    try {
      const { sendNotification } = require('../services/firebaseService');
      const fcmResult = await sendNotification(
        customer.fcmToken,
        notificationTitle,
        notificationBody,
        {
          type: 'EMI_REMINDER',
          pendingCount: pendingEmis.length.toString(),
          totalPendingAmount: totalPendingAmount.toString(),
          customerId: customer._id.toString()
        }
      );

      console.log('FCM Result:', JSON.stringify(fcmResult, null, 2));

      if (fcmResult.success) {
        console.log('✅ EMI reminder notification sent successfully');
        console.log('Message ID:', fcmResult.messageId);
        console.log('=========================================\n');

        return res.status(200).json({
          success: true,
          message: 'EMI reminder notification sent successfully',
          data: {
            customerId: customer._id.toString(),
            customerName: customer.fullName,
            mobileNumber: customer.mobileNumber,
            pendingEmisCount: pendingEmis.length,
            totalPendingAmount,
            notificationSent: true,
            messageId: fcmResult.messageId
          }
        });
      } else {
        console.warn('⚠️  Failed to send EMI reminder notification');
        console.warn('Error:', fcmResult.error);
        console.warn('Message:', fcmResult.message);

        // If token is invalid, clear it from database
        if (fcmResult.error === 'INVALID_TOKEN') {
          customer.fcmToken = null;
          await customer.save();
          console.log('🗑️  Cleared invalid FCM token from database');
        }

        console.log('=========================================\n');

        return res.status(400).json({
          success: false,
          message: 'Failed to send notification',
          error: fcmResult.error,
          details: fcmResult.message
        });
      }
    } catch (error) {
      console.error('❌ FCM notification exception:', error);
      console.error('Error stack:', error.stack);
      console.log('=========================================\n');

      return res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: 'FCM_ERROR',
        details: error.message
      });
    }
  } catch (error) {
    console.error('❌ Send EMI reminder error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to send EMI reminder',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Get customer location by admin
 * Admin only - can access any customer's location
 */
const getCustomerLocationByAdmin = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Validate customerId format
    if (!customerId || !customerId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format',
        error: 'VALIDATION_ERROR'
      });
    }

    const Customer = require('../models/Customer');

    // Find customer
    const customer = await Customer.findById(customerId)
      .select('fullName mobileNumber location')
      .lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
        error: 'CUSTOMER_NOT_FOUND'
      });
    }

    // Check if location data exists
    if (!customer.location || !customer.location.latitude || !customer.location.longitude) {
      return res.status(404).json({
        success: false,
        message: 'Location data not available for this customer',
        error: 'LOCATION_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer location fetched successfully',
      data: {
        customerId: customer._id.toString(),
        customerName: customer.fullName,
        mobileNumber: customer.mobileNumber,
        location: {
          latitude: customer.location.latitude,
          longitude: customer.location.longitude,
          lastUpdated: customer.location.lastUpdated
        }
      }
    });
  } catch (error) {
    console.error('Get customer location by admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer location',
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
  getCustomerLockStatus,
  getLockedCustomersImei,
  getPendingEmiCustomersAdmin,
  getEmiStatisticsAdmin,
  getCustomerCountAdmin,
  sendEmiReminder,
  getCustomerLocationByAdmin
};

