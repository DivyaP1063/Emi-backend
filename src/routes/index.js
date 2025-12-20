const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const retailerRoutes = require('./retailerRoutes');
const { authenticate } = require('../middleware/auth');
const { getAllCustomers, updateEmiPaymentStatus, toggleCustomerLock } = require('../controllers/authController');
const { getLateFine, updateLateFine, updateLateFineValidation } = require('../controllers/lateFineController');
const { updateRetailerStatus, updateRetailerStatusValidation } = require('../controllers/retailerController');

// Mount routes
router.use('/auth', authRoutes);

// Retailer Status Update (Admin only) - Must be before retailerRoutes mount
router.put('/retailers/:retailerId/status', authenticate, updateRetailerStatusValidation, updateRetailerStatus);

router.use('/retailers', retailerRoutes);

// Customer routes (Admin only)
router.get('/customers', authenticate, getAllCustomers);

// EMI Payment Status Update (Admin only)
router.put('/customers/:customerId/emi/:monthNumber', authenticate, updateEmiPaymentStatus);

// Customer Lock/Unlock (Admin only)
router.put('/customers/:customerId/lock', authenticate, toggleCustomerLock);

// Late Fine routes
router.get('/late-fine', getLateFine); // Public - no auth required
router.put('/late-fine', authenticate, updateLateFineValidation, updateLateFine); // Admin only

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
