const { generateEnrollmentToken, buildProvisioningPayload, findDeviceByImei, getDeviceStatus, factoryResetDevice: resetDevice } = require('../services/androidManagementService');
const { generateQRCode } = require('../services/qrCodeService');
const Customer = require('../models/Customer');


/**
 * Generate QR Code for Customer Device Provisioning
 * POST /api/admin/amapi/qr/:customerId
 */
const generateCustomerQR = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { policyId = "policy_emi_default", duration = 3600 } = req.body;

    console.log("\n🎫 ===== ADMIN: GENERATE QR CODE =====");
    console.log(`Customer ID: ${customerId}`);
    console.log(`Policy: ${policyId}`);

    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "CUSTOMER_NOT_FOUND",
        message: "Customer not found",
      });
    }

    // Generate enrollment token
    const tokenResult = await generateEnrollmentToken(
      customerId,
      policyId,
      duration
    );
    if (!tokenResult.success) {
      return res.status(500).json({
        success: false,
        error: "TOKEN_GENERATION_FAILED",
        message: tokenResult.error,
      });
    }

    // Build provisioning payload
    const payload = buildProvisioningPayload(customerId, tokenResult.token);

    // Generate QR code
    const qrResult = await generateQRCode(payload, 512);
    if (!qrResult.success) {
      return res.status(500).json({
        success: false,
        error: "QR_GENERATION_FAILED",
        message: qrResult.error,
      });
    }

    console.log("✅ QR Code generated successfully");
    console.log("====================================\n");

    return res.status(200).json({
      success: true,
      message: "QR code generated successfully",
      data: {
        customerId,
        customerName: customer.fullName,
        qrCode: qrResult.qrCode,
        enrollmentToken: tokenResult.token,
        expiresAt: tokenResult.expirationTime,
        policyId,
        payload,
      },
    });
  } catch (error) {
    console.error("❌ Generate QR error:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

/**
 * List All Enrolled Devices
 * GET /api/admin/amapi/devices
 */
const listEnrolledDevices = async (req, res) => {
  try {
    console.log("\n📱 ===== ADMIN: LIST DEVICES =====");

    // Find customers with AMAPI enrollment data
    const customers = await Customer.find({
      "amapiEnrollment.enrolled": true,
    }).select("fullName mobileNumber imei1 amapiEnrollment");

    console.log(`✅ Found ${customers.length} enrolled devices`);
    console.log("=================================\n");

    return res.status(200).json({
      success: true,
      count: customers.length,
      devices: customers.map((c) => ({
        customerId: c._id,
        customerName: c.fullName,
        mobileNumber: c.mobileNumber,
        imei: c.imei1,
        enrollment: c.amapiEnrollment,
      })),
    });
  } catch (error) {
    console.error("❌ List devices error:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

/**
 * Get Device Details by IMEI
 * GET /api/admin/amapi/devices/:imei
 */
const getDeviceDetails = async (req, res) => {
  try {
    const { imei } = req.params;

    console.log("\n📱 ===== ADMIN: GET DEVICE DETAILS =====");
    console.log(`IMEI: ${imei}`);

    // Find customer by IMEI
    const customer = await Customer.findOne({ imei1: imei });
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "CUSTOMER_NOT_FOUND",
        message: "No customer found with this IMEI",
      });
    }

    // Get device from AMAPI
    let amapiDevice = null;
    try {
      const deviceResult = await findDeviceByImei(imei);
      if (deviceResult) {
        const statusResult = await getDeviceStatus(deviceResult.name);
        amapiDevice = statusResult.success ? statusResult.device : null;
      }
    } catch (error) {
      console.log("⚠️  Could not fetch AMAPI device status:", error.message);
    }

    console.log("✅ Device details retrieved");
    console.log("=======================================\n");

    return res.status(200).json({
      success: true,
      data: {
        customer: {
          id: customer._id,
          fullName: customer.fullName,
          mobileNumber: customer.mobileNumber,
          imei: customer.imei1,
          isLocked: customer.isLocked,
          isActive: customer.isActive,
          fcmToken: customer.fcmToken ? "Present" : "Missing",
        },
        amapiEnrollment: customer.amapiEnrollment,
        amapiDevice,
      },
    });
  } catch (error) {
    console.error("❌ Get device details error:", error);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message,
    });
  }
};

/**
 * Factory Reset Device (Emergency Only)
 * POST /api/admin/amapi/devices/:imei/factory-reset
 */
const factoryResetDevice = async (req, res) => {
    try {
        const { imei } = req.params;
        const { confirm } = req.body;

        console.log('\n🔴 ===== ADMIN: FACTORY RESET REQUEST =====');
        console.log(`IMEI: ${imei}`);
        console.warn('⚠️  DESTRUCTIVE OPERATION - WIPES ALL DATA');

        // Require explicit confirmation
        if (confirm !== 'FACTORY_RESET_CONFIRMED') {
            return res.status(400).json({
                success: false,
                error: 'CONFIRMATION_REQUIRED',
                message: 'You must confirm factory reset by sending: { "confirm": "FACTORY_RESET_CONFIRMED" }'
            });
        }

        // Find customer by IMEI
        const customer = await Customer.findOne({ imei1: imei });
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'CUSTOMER_NOT_FOUND',
                message: 'No customer found with this IMEI'
            });
        }

        // Find device in AMAPI
        // findDeviceByImei and factoryResetDevice are already imported at the top
        
        const device = await findDeviceByImei(imei);
        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'DEVICE_NOT_ENROLLED',
                message: 'Device not enrolled in Android Management'
            });
        }

        // Issue factory reset (using renamed import to avoid conflict)
        const result = await resetDevice(device.name);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: 'FACTORY_RESET_FAILED',
                message: result.error
            });
        }

        // Update customer record
        customer.amapiEnrollment.enrolled = false;
        customer.amapiEnrollment.deviceName = null;
        await customer.save();

        console.log('✅ Factory reset initiated');
        console.log('Device will be wiped and removed from enterprise');
        console.log('===========================================\n');

        return res.status(200).json({
            success: true,
            message: 'Factory reset initiated successfully. Device will be wiped.',
            data: {
                customerId: customer._id,
                customerName: customer.fullName,
                imei,
                action: 'FACTORY_RESET',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Factory reset error:', error);
        return res.status(500).json({
            success: false,
            error: 'SERVER_ERROR',
            message: error.message
        });
    }
};

module.exports = {
  generateCustomerQR,
  listEnrolledDevices,
  getDeviceDetails,
  factoryResetDevice
};
