const express = require('express');
const router = express.Router();
const { authenticateRetailer } = require('../middleware/auth');
const { generateQRCode } = require('../services/qrCodeService');
const { generateEnrollmentToken, buildProvisioningPayload } = require('../services/androidManagementService');
const Customer = require('../models/Customer');

/**
 * Generate QR Code for Device Provisioning - Retailer Endpoint
 * POST /api/retailer/device-setup/qr/:customerId
 * 
 * This endpoint allows retailers to generate QR codes when selling devices
 */
const generateDeviceSetupQR = async (req, res) => {
  try {
    const { customerId } = req.params;
    const retailerId = req.retailer.id;

    console.log('\n🎫 ===== RETAILER: GENERATE DEVICE QR CODE =====');
    console.log(`Retailer: ${req.retailer.shopName}`);
    console.log(`Customer ID: ${customerId}`);

    // Verify customer belongs to this retailer
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'CUSTOMER_NOT_FOUND',
        message: 'Customer not found'
      });
    }

    // Check if customer belongs to this retailer
    if (customer.retailerId.toString() !== retailerId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'This customer does not belong to your shop'
      });
    }

    // Check if device already enrolled
    if (customer.amapiEnrollment?.enrolled) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_ENROLLED',
        message: 'Device is already enrolled. Factory reset required for new enrollment.',
        enrolledAt: customer.amapiEnrollment.enrolledAt
      });
    }

    // Generate enrollment token
    const tokenResult = await generateEnrollmentToken(
      customerId,
      process.env.ANDROID_MANAGEMENT_DEFAULT_POLICY_ID || 'policy1',  // Use env var or fallback
      3600  // 1 hour validity
    );

    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
        error: 'TOKEN_GENERATION_FAILED',
        message: tokenResult.error
      });
    }

    // Build provisioning payload
    const payload = buildProvisioningPayload(customerId, tokenResult.token);

    // Generate QR code
    const qrResult = await generateQRCode(payload, 512);

    if (!qrResult.success) {
      return res.status(500).json({
        success: false,
        error: 'QR_GENERATION_FAILED',
        message: qrResult.error
      });
    }

    // Store enrollment token in customer record
    customer.amapiEnrollment = {
      ...customer.amapiEnrollment,
      enrollmentToken: tokenResult.token
    };
    await customer.save();

    console.log('✅ QR Code generated successfully');
    console.log(`Valid until: ${tokenResult.expirationTime}`);
    console.log('===============================================\n');

    return res.status(200).json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        customerId,
        customerName: customer.fullName,
        mobileNumber: customer.mobileNumber,
        qrCode: qrResult.qrCode,
        expiresAt: tokenResult.expirationTime,
        instructions: {
          step1: 'Factory reset the device',
          step2: 'Start setup wizard',
          step3: 'Tap screen 6 times to open camera',
          step4: 'Scan this QR code',
          step5: 'Device will auto-configure'
        }
      }
    });

  } catch (error) {
    console.error('❌ Generate device QR error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message
    });
  }
};

module.exports = {
  generateDeviceSetupQR
};
