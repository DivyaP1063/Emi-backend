const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for OTP requests
 * 3 requests per 5 minutes per IP
 */
const otpRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 3,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use mobile number as key for more accurate rate limiting
  keyGenerator: (req) => {
    return req.body.mobileNumber || req.ip;
  }
});

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  otpRateLimiter,
  apiRateLimiter
};
