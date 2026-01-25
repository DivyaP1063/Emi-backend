const express = require("express");
const router = express.Router();
const { generateCustomerQR } = require("../controllers/qrController");
const { authenticate } = require("../middleware/auth");

/**
 * QR Code Generation Routes (Admin)
 * Simplified routes for device provisioning QR codes
 */

// POST /api/admin/qr/:customerId - Generate QR code for customer device
router.post("/qr/:customerId", authenticate, generateCustomerQR);

// GET /api/admin/qr/:customerId - Also support GET for convenience
router.get("/qr/:customerId", authenticate, generateCustomerQR);

module.exports = router;
