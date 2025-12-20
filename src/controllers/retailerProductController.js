const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
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
      fatherName, village, nearbyLocation, post, district,
      // EMI Details (Step 5)
      branch, phoneType, model, productName, sellPrice, landingPrice,
      downPayment, downPaymentPending, numberOfMonths
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

    // EMI Details validation
    if (!branch || !branch.trim()) validationErrors.branch = 'Branch is required';
    if (!phoneType || !['NEW', 'OLD'].includes(phoneType.toUpperCase())) validationErrors.phoneType = 'Phone type must be NEW or OLD';
    if (!model || !model.trim()) validationErrors.model = 'Model is required';
    if (!productName || !productName.trim()) validationErrors.productName = 'Product name is required';
    if (!sellPrice || isNaN(sellPrice) || Number(sellPrice) <= 0) validationErrors.sellPrice = 'Valid sell price is required';
    if (!landingPrice || isNaN(landingPrice) || Number(landingPrice) <= 0) validationErrors.landingPrice = 'Valid landing price is required';
    if (downPayment === undefined || isNaN(downPayment) || Number(downPayment) < 0) validationErrors.downPayment = 'Valid down payment is required';
    if (downPaymentPending === undefined || isNaN(downPaymentPending) || Number(downPaymentPending) < 0) validationErrors.downPaymentPending = 'Valid down payment pending amount is required';
    if (!numberOfMonths || isNaN(numberOfMonths) || Number(numberOfMonths) < 1) validationErrors.numberOfMonths = 'Valid number of months is required';

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        details: validationErrors
      });
    }

    // Calculate EMI details with 3% interest rate
    const sellPriceNum = Number(sellPrice);
    const landingPriceNum = Number(landingPrice);
    const downPaymentNum = Number(downPayment);
    const downPaymentPendingNum = Number(downPaymentPending);
    const numberOfMonthsNum = Number(numberOfMonths);
    const emiRate = 3; // 3% interest rate

    const balanceAmount = landingPriceNum - downPaymentNum;
    const interestAmount = (balanceAmount * emiRate) / 100;
    const totalEmiAmount = balanceAmount + interestAmount;
    const emiPerMonth = totalEmiAmount / numberOfMonthsNum;

    // Validate balance amount is positive
    if (balanceAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Down payment cannot be greater than landing price',
        error: 'INVALID_EMI_DETAILS'
      });
    }

    // Validate down payment pending doesn't exceed down payment
    if (downPaymentPendingNum > downPaymentNum) {
      return res.status(400).json({
        success: false,
        message: 'Down payment pending cannot be greater than down payment',
        error: 'INVALID_DOWN_PAYMENT_PENDING'
      });
    }

    // Create EMI months array with interest and due dates (all unpaid by default)
    const emiMonths = [];
    const currentDate = new Date();

    for (let i = 1; i <= numberOfMonthsNum; i++) {
      // Calculate due date: first EMI is due 1 month from now, then each subsequent month
      const dueDate = new Date(currentDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      emiMonths.push({
        month: i,
        dueDate,
        paid: false,
        amount: Math.round(emiPerMonth * 100) / 100 // Round to 2 decimal places
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

    // Check duplicate IMEI2 (if provided)
    if (imei2) {
      const existingCustomer2 = await Customer.findOne({ imei2 });
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

    // Create customer with IMEI and EMI information
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
      emiDetails: {
        branch,
        phoneType: phoneType.toUpperCase(),
        model,
        productName,
        sellPrice: sellPriceNum,
        landingPrice: landingPriceNum,
        downPayment: downPaymentNum,
        downPaymentPending: downPaymentPendingNum,
        emiRate,
        numberOfMonths: numberOfMonthsNum,
        emiMonths,
        balanceAmount,
        emiPerMonth: Math.round(emiPerMonth * 100) / 100,
        totalEmiAmount: Math.round(totalEmiAmount * 100) / 100
      },
      retailerId
    });

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully with device and EMI information',
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
        emiDetails: customer.emiDetails,
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

/**
 * Get customers with pending EMI payments (retailer's customers only)
 */
const getPendingEmiCustomers = async (req, res) => {
  try {
    const retailerId = req.retailer.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const skip = (page - 1) * limit;

    // Build base query for retailer's customers
    let matchQuery = { retailerId: new mongoose.Types.ObjectId(retailerId) };

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
      { $limit: limit },
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
          isLocked: 1,
          'emiDetails.branch': 1,
          'emiDetails.phoneType': 1,
          'emiDetails.model': 1,
          'emiDetails.productName': 1,
          'emiDetails.emiPerMonth': 1,
          'emiDetails.numberOfMonths': 1,
          pendingEmis: 1,
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
    const totalPages = Math.ceil(totalItems / limit);

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
    console.error('Get pending EMI customers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pending EMI customers',
      error: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  sendCustomerOTP,
  verifyCustomerOTP,
  createCustomer,
  getCustomers,
  getPendingEmiCustomers
};