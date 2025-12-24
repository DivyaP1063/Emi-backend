require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const { apiRateLimiter } = require('./middleware/rateLimiter');
const adminRoutes = require('./routes');
const retailerApiRoutes = require('./routes/retailerApiRoutes');
const accountantApiRoutes = require('./routes/accountantApiRoutes');
const recoveryHeadApiRoutes = require('./routes/recoveryHeadApiRoutes');
const customerDeviceRoutes = require('./routes/customerDeviceRoutes');
const { initializeFirebase } = require('./services/firebaseService');

// Initialize Express app
const app = express();

// Trust proxy for accurate IP addresses (required for Render deployment)
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Initialize Firebase Admin SDK
try {
  initializeFirebase();
} catch (error) {
  console.error('⚠️  Firebase initialization failed:', error.message);
  console.log('ℹ️  Server will continue without FCM notifications');
}

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Apply rate limiting to all routes
app.use(apiRateLimiter);

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/retailer', retailerApiRoutes);
app.use('/api/accountant', accountantApiRoutes);
app.use('/api/recovery-head', recoveryHeadApiRoutes);
app.use('/api/customer/device', customerDeviceRoutes);

console.log('✅ Accountant routes mounted at /api/accountant');
console.log('✅ Recovery head routes mounted at /api/recovery-head');
console.log('✅ Customer device routes mounted at /api/customer/device');

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Admin Backend API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/admin/health',
      auth: {
        sendOtp: 'POST /api/admin/auth/send-otp',
        verifyOtp: 'POST /api/admin/auth/verify-otp'
      },
      retailers: {
        create: 'POST /api/admin/retailers',
        getAll: 'GET /api/admin/retailers'
      }
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: 'NOT_FOUND'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: 'SERVER_ERROR'
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api/admin`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});
