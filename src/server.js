require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const { apiRateLimiter } = require('./middleware/rateLimiter');
const adminRoutes = require('./routes');
const retailerApiRoutes = require('./routes/retailerApiRoutes');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

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
