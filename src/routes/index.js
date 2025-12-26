const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const retailerRoutes = require("./retailerRoutes");
const recoveryHeadRoutes = require("./recoveryHeadRoutes");
const recoveryHeadApiRoutes = require("./recoveryHeadApiRoutes");
const accountantRoutes = require("./accountantRoutes");
const amapiAdminRoutes = require("./amapiAdminRoutes");
const { authenticate } = require("../middleware/auth");
const {
  getAllCustomers,
  updateEmiPaymentStatus,
  toggleCustomerLock,
  getCustomerLockStatus,
  getLockedCustomersImei,
  getPendingEmiCustomersAdmin,
  getEmiStatisticsAdmin,
  getCustomerCountAdmin,
  sendEmiReminder, getCustomerLocationByAdmin,
} = require("../controllers/authController");
const {
  getLateFine,
  updateLateFine,
  updateLateFineValidation,
} = require("../controllers/lateFineController");
const {
  updateRetailerStatus,
  updateRetailerStatusValidation,
} = require("../controllers/retailerController");
const {
  updateRecoveryHeadStatus,
  updateRecoveryHeadStatusValidation,
} = require("../controllers/recoveryHeadController");

// Mount routes
router.use("/auth", authRoutes);

// Retailer Status Update (Admin only) - Must be before retailerRoutes mount
router.use(
  "/retailers/:retailerId/status",
  authenticate,
  updateRetailerStatusValidation,
  updateRetailerStatus
);

router.use("/retailers", retailerRoutes);

// Recovery Head Status Update (Admin only) - Must be before recoveryHeadRoutes mount
router.use(
  "/recovery-heads/:recoveryHeadId/status",
  authenticate,
  updateRecoveryHeadStatusValidation,
  updateRecoveryHeadStatus
);

// Recovery Head Admin routes (Admin management)
router.use("/recovery-heads", recoveryHeadRoutes);

// Recovery Head Authentication routes (Public - for recovery head login)
router.use("/recovery-head", recoveryHeadApiRoutes);

// Accountant routes (Admin management only - for creating/managing accountants)
router.use("/accountants", accountantRoutes);

// Android Management API Admin routes
router.use("/amapi", amapiAdminRoutes);

// Customer routes (Admin only)
router.get("/customers", authenticate, getAllCustomers);

// Get locked customers IMEI (Admin only)
router.get("/customers/locked/imei", authenticate, getLockedCustomersImei);

// Get customers with pending EMI (Admin only)
router.get("/customers/pending-emi", authenticate, getPendingEmiCustomersAdmin);

// Get EMI statistics (Admin only)
router.get("/emi/statistics", authenticate, getEmiStatisticsAdmin);

// Get customer count statistics (Admin only)
router.get("/customers/count", authenticate, getCustomerCountAdmin);

// EMI Payment Status Update (Admin only)
router.put(
  "/customers/:customerId/emi/:monthNumber",
  authenticate,
  updateEmiPaymentStatus
);

// Customer Lock/Unlock (Admin only)
router.put("/customers/:customerId/lock", authenticate, toggleCustomerLock);

// Get Customer Lock Status (Admin only)
router.get(
  "/customers/:customerId/lock-status",
  authenticate,
  getCustomerLockStatus
);

// Send EMI Reminder Notification (Admin only)
router.post("/customers/emi-reminder", authenticate, sendEmiReminder);

// Late Fine routes
router.get("/late-fine", getLateFine); // Public - no auth required
router.put(
  "/late-fine",
  authenticate,
  updateLateFineValidation,
  updateLateFine
); // Admin only

// Get Customer Location (Admin only)
router.get('/customers/:customerId/location', authenticate, getCustomerLocationByAdmin);

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin API is running",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
