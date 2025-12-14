const express = require('express');
const router = express.Router();
const { authenticateRetailer } = require('../middleware/auth');
const { otpRateLimiter } = require('../middleware/rateLimiter');
const { uploadDocuments } = require('../middleware/upload');
const retailerAuthController = require('../controllers/retailerAuthController');
const retailerBusinessController = require('../controllers/retailerBusinessController');
const retailerProductController = require('../controllers/retailerProductController');

/**
 * @route   POST /api/retailer/auth/send-otp
 * @desc    Send OTP to retailer mobile number
 * @access  Public
 */
router.post(
  '/auth/send-otp',
  otpRateLimiter,
  retailerAuthController.sendOtpValidation,
  retailerAuthController.sendOtpController
);

/**
 * @route   POST /api/retailer/auth/verify-otp
 * @desc    Verify OTP and login retailer
 * @access  Public
 */
router.post(
  '/auth/verify-otp',
  retailerAuthController.verifyOtpValidation,
  retailerAuthController.verifyOtpController
);

/**
 * @route   GET /api/retailer/permissions
 * @desc    Get retailer permissions and allowed EMI months
 * @access  Protected (Retailer only)
 */
router.get(
  '/permissions',
  authenticateRetailer,
  retailerBusinessController.getPermissions
);

// ========== Multi-Step Product Addition Flow ==========

/**
 * @route   POST /api/retailer/products/step1
 * @desc    Step 1: Validate customer basic details (name, aadhar, DOB, pincode, IMEI)
 * @access  Protected (Retailer only)
 */
router.post(
  '/products/step1',
  authenticateRetailer,
  retailerProductController.validateStep1,
  retailerProductController.addProductStep1
);

/**
 * @route   POST /api/retailer/products/step2/send-otp
 * @desc    Step 2a: Send OTP to customer mobile number
 * @access  Protected (Retailer only)
 */
router.post(
  '/products/step2/send-otp',
  authenticateRetailer,
  otpRateLimiter,
  retailerProductController.addProductStep2SendOTP,
  retailerProductController.sendMobileOTP
);

/**
 * @route   POST /api/retailer/products/step2/verify-otp
 * @desc    Step 2b: Verify customer mobile OTP
 * @access  Protected (Retailer only)
 */
router.post(
  '/products/step2/verify-otp',
  authenticateRetailer,
  retailerProductController.addProductStep2VerifyOTP,
  retailerProductController.verifyMobileOTP
);

/**
 * @route   POST /api/retailer/products/step3
 * @desc    Step 3: Validate address details (father name, village, post, district)
 * @access  Protected (Retailer only)
 */
router.post(
  '/products/step3',
  authenticateRetailer,
  retailerProductController.validateStep3,
  retailerProductController.addProductStep3
);

/**
 * @route   POST /api/retailer/products/submit
 * @desc    Step 4: Final submission with document uploads
 * @access  Protected (Retailer only)
 */
router.post(
  '/products/submit',
  authenticateRetailer,
  uploadDocuments,
  retailerProductController.addProductFinal
);

/**
 * @route   GET /api/retailer/customers
 * @desc    Get all customers registered by this retailer with pagination
 * @access  Protected (Retailer only)
 */
router.get(
  '/customers',
  authenticateRetailer,
  retailerProductController.getCustomers
);

module.exports = router;
