const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const retailerRoutes = require("./retailerRoutes");
const recoveryHeadRoutes = require("./recoveryHeadRoutes");
const recoveryHeadApiRoutes = require("./recoveryHeadApiRoutes");
const stockistRoutes = require("./stockistRoutes");
const accountantRoutes = require("./accountantRoutes");
const qrRoutes = require("./qrRoutes");
const adminOAuthRoutes = require("./adminOAuthRoutes");
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
  deleteCustomer,
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

const adminBrandRoutes = require('./adminBrandRoutes');
const publicBrandRoutes = require('./publicBrandRoutes');
const adminPincodeRoutes = require('./adminPincodeRoutes');

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

// Stockist routes (Public auth + Protected APIs)
router.use("/stockist", stockistRoutes);

// Accountant routes (Admin management only - for creating/managing accountants)
router.use("/accountants", accountantRoutes);

// QR Code Generation routes (Admin)
router.use("/", qrRoutes);

// Admin OAuth routes (for Private App Uploader login)
router.use("/oauth", adminOAuthRoutes);

// Plan routes (Admin only)
const planRoutes = require("./planRoutes");
router.use("/", planRoutes);
// Brand Management routes (Admin only)
router.use("/admin", adminBrandRoutes);

// Public Brand routes (for retailers/public)
router.use("/", publicBrandRoutes);
// Brand Management routes (Admin only) - mounted at root since server.js already has /api/admin
router.use("/", adminBrandRoutes);

// Pincode Management routes (Admin only) - mounted at root since server.js already has /api/admin
router.use("/", adminPincodeRoutes);

// Report routes (Admin only)
const reportRoutes = require("./reportRoutes");
router.use("/reports", reportRoutes);

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

// Delete Customer Completely (Admin only)
router.delete('/customers/:customerId', authenticate, deleteCustomer);

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin API is running",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
