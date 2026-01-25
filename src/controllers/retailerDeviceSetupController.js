const { generateProvisioningQR } = require("../services/qrProvisioningService");
const Customer = require("../models/Customer");
const Admin = require("../models/Admin");

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

    console.log("\n🎫 ===== RETAILER: GENERATE DEVICE QR CODE =====");
    console.log(`Retailer: ${req.retailer.shopName}`);
    console.log(`Customer ID: ${customerId}`);

    // Verify customer belongs to this retailer
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "CUSTOMER_NOT_FOUND",
        message: "Customer not found",
      });
    }

    // Check if customer belongs to this retailer
    if (customer.retailerId.toString() !== retailerId) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "This customer does not belong to your shop",
      });
    }

    // Get FRP UserId from admin (optional)
    const admin = await Admin.findOne({
      isActive: true,
      googleUserId: { $ne: null },
    })
      .select("googleUserId")
      .lean();
    const frpUserId = admin?.googleUserId || "";

    // Generate provisioning QR
    const qrResult = await generateProvisioningQR(customerId, frpUserId, 512);

    if (!qrResult.success) {
      return res.status(500).json({
        success: false,
        error: "QR_GENERATION_FAILED",
        message: qrResult.error,
      });
    }

    console.log("✅ QR Code generated successfully");
    console.log("===============================================\n");

    return res.status(200).json({
      success: true,
      message: "QR code generated successfully",
      data: {
        customerId,
        customerName: customer.fullName,
        mobileNumber: customer.mobileNumber,
        qrCode: qrResult.qrCode,
        payload: qrResult.payload,
        instructions: {
          step1: "Factory reset the device",
          step2: "Start setup wizard",
          step3: "Tap screen 6 times to open camera",
          step4: "Scan this QR code",
          step5: "Device will auto-configure",
        },
      },
    });
  } catch (error) {
    console.error("❌ Generate device QR error:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

module.exports = {
  generateDeviceSetupQR,
};
