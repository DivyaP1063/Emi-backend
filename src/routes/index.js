const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const retailerRoutes = require('./retailerRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/retailers', retailerRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
