const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const retailerRoutes = require('./retailerRoutes');
const { authenticate } = require('../middleware/auth');
const { getAllCustomers } = require('../controllers/authController');

// Mount routes
router.use('/auth', authRoutes);
router.use('/retailers', retailerRoutes);

// Customer routes (Admin only)
router.get('/customers', authenticate, getAllCustomers);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
