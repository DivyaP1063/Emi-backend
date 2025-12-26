const express = require("express");
const router = express.Router();
const { authenticateRetailer } = require("../middleware/auth");
const { otpRateLimiter } = require("../middleware/rateLimiter");
const { uploadDocuments } = require("../middleware/upload");
const retailerAuthController = require("../controllers/retailerAuthController");
const retailerBusinessController = require("../controllers/retailerBusinessController");
const retailerProductController = require("../controllers/retailerProductController");
const retailerDeviceSetupRoutes = require("./retailerDeviceSetupRoutes");

/**
 * @route   POST /api/retailer/auth/send-otp
 * @desc    Send OTP to retailer mobile number
 * @access  Public
 */
router.post(
  "/auth/send-otp",
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
  "/auth/verify-otp",
  retailerAuthController.verifyOtpValidation,
  retailerAuthController.verifyOtpController
);

/**
 * @route   GET /api/retailer/permissions
 * @desc    Get retailer permissions and allowed EMI months
 * @access  Protected (Retailer only)
 */
router.get(
  "/permissions",
  authenticateRetailer,
  retailerBusinessController.getPermissions
);

// ========== Customer Registration (3 APIs) ==========

/**
 * @route   POST /api/retailer/customers/send-otp
 * @desc    Step 2: Send OTP to customer mobile number
 * @access  Protected (Retailer only)
 */
router.post(
  "/customers/send-otp",
  authenticateRetailer,
  otpRateLimiter,
  retailerProductController.sendCustomerOTP
);

/**
 * @route   POST /api/retailer/customers/verify-otp
 * @desc    Step 2: Verify customer mobile OTP (marks as verified, must pass to proceed)
 * @access  Protected (Retailer only)
 */
router.post(
  "/customers/verify-otp",
  authenticateRetailer,
  retailerProductController.verifyCustomerOTP
);

/**
 * @route   POST /api/retailer/customers
 * @desc    Step 4 (Final): Create customer with all data from steps 1-4 (basic details, verified mobile, address, documents)
 * @access  Protected (Retailer only)
 */
router.post(
  "/customers",
  authenticateRetailer,
  uploadDocuments,
  retailerProductController.createCustomer
);

/**
 * @route   GET /api/retailer/customers
 * @desc    Get all customers registered by this retailer with pagination
 * @access  Protected (Retailer only)
 */
router.get(
  "/customers",
  authenticateRetailer,
  retailerProductController.getCustomers
);

/**
 * @route   GET /api/retailer/customers/pending-emi
 * @desc    Get customers with pending EMI payments (retailer's customers only)
 * @access  Protected (Retailer only)
 */
router.get(
  "/customers/pending-emi",
  authenticateRetailer,
  retailerProductController.getPendingEmiCustomers
);

/**
 * @route   GET /api/retailer/emi/statistics
 * @desc    Get EMI statistics for retailer's customers
 * @access  Protected (Retailer only)
 */
router.get(
  "/emi/statistics",
  authenticateRetailer,
  retailerProductController.getEmiStatisticsRetailer
);

/**
 * @route   GET /api/retailer/customers/count
 * @desc    Get customer count statistics for retailer's customers
 * @access  Protected (Retailer only)
 */
router.get(
  "/customers/count",
  authenticateRetailer,
  retailerProductController.getCustomerCountRetailer
);

/**
 * @route   POST /api/retailer/verify-aadhar
 * @desc    Verify if Aadhar number is safe to register (checks for existing customer and pending EMIs)
 * @access  Protected (Retailer only)
 */
router.post(
  "/verify-aadhar",
  authenticateRetailer,
  retailerProductController.verifyAadharValidation,
  retailerProductController.verifyAadharNumber
);

// ========== Device Setup & Provisioning ==========
router.use("/device-setup", retailerDeviceSetupRoutes);

module.exports = router;
