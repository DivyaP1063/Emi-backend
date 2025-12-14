const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createRetailer,
  getAllRetailers,
  createRetailerValidation
} = require('../controllers/retailerController');

// All retailer routes require authentication
router.use(authenticate);

// POST /api/admin/retailers - Create new retailer
router.post('/', createRetailerValidation, createRetailer);

// GET /api/admin/retailers - Get all retailers
router.get('/', getAllRetailers);

module.exports = router;
