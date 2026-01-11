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
const recoveryPersonApiRoutes = require('./routes/recoveryPersonApiRoutes');
const stockistRoutes = require('./routes/stockistRoutes');
const customerDeviceRoutes = require('./routes/customerDeviceRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const { initializeFirebase } = require('./services/firebaseService');
const { startCronService, stopCronService } = require('./services/cronService');
const { initializeAndroidManagement } = require('./services/androidManagementService');
const { initializeActivityMonitor } = require('./services/deviceActivityMonitor');

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

// Initialize Android Management API
try {
  initializeAndroidManagement();
} catch (error) {
  console.error('⚠️  Android Management API initialization failed:', error.message);
  console.log('ℹ️  Server will continue without Android Management fallback');
}

// Initialize Device Activity Monitor (auto-mark inactive devices)
try {
  initializeActivityMonitor();
} catch (error) {
  console.error('⚠️  Device Activity Monitor initialization failed:', error.message);
  console.log('ℹ️  Server will continue without activity monitoring');
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "https://play.google.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],  // Allow onclick handlers
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
})); // Security headers with iframe support

// Configure CORS to allow both local and production frontend
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://report-92bj.onrender.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions)); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from public folder
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// Apply rate limiting to API routes only
app.use('/api', apiRateLimiter);

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/retailer', retailerApiRoutes);
app.use('/api/accountant', accountantApiRoutes);
app.use('/api/recovery-head', recoveryHeadApiRoutes);
app.use('/api/recovery-person', recoveryPersonApiRoutes);
app.use('/api/stockist', stockistRoutes);
app.use('/api/customer/device', customerDeviceRoutes);
app.use('/api/webhooks', webhookRoutes); // AMAPI webhooks

console.log('✅ Accountant routes mounted at /api/accountant');
console.log('✅ Recovery head routes mounted at /api/recovery-head');
console.log('✅ Recovery person routes mounted at /api/recovery-person');
console.log('✅ Stockist routes mounted at /api/stockist');
console.log('✅ Customer device routes mounted at /api/customer/device');

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Admin Backend API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
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

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api/admin`);

  // Start cron service after server is ready
  startCronService();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM signal received: closing HTTP server');
  stopCronService();
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT signal received: closing HTTP server');
  stopCronService();
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  stopCronService();
  // Close server & exit process
  process.exit(1);
});
