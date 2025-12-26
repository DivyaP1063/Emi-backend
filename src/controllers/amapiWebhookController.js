const Customer = require("../models/Customer");
const crypto = require('crypto');

/**
 * Verify webhook signature from Google AMAPI
 * @param {object} req - Express request object
 * @returns {boolean} True if signature is valid
 */
const verifyWebhookSignature = (req) => {
  try {
    // Get signature from header
    const signature = req.headers['x-goog-signature'];
    
    if (!signature) {
      console.warn('⚠️  No signature in webhook request');
      return false;
    }

    // Get webhook secret from environment
    const secret = process.env.AMAPI_WEBHOOK_SECRET;
    
    if (!secret) {
      console.warn('⚠️  AMAPI_WEBHOOK_SECRET not configured');
      return false;
    }

    // Calculate expected signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Compare signatures (constant-time comparison)
    const receivedSignature = signature.replace('sha256=', '');
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.warn('⚠️  Invalid webhook signature');
      console.log('Expected:', expectedSignature.substring(0, 20) + '...');
      console.log('Received:', receivedSignature.substring(0, 20) + '...');
    }

    return isValid;

  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error.message);
    return false;
  }
};

/**
 * Handle AMAPI Webhook Events
 * POST /api/webhooks/amapi
 */
const handleAMAPIWebhook = async (req, res) => {
  try {
    console.log("\n🔔 ===== AMAPI WEBHOOK RECEIVED =====");
    console.log("Timestamp:", new Date().toISOString());

    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      console.error('❌ Webhook signature verification failed');
      console.log('Rejecting unauthorized webhook request');
      console.log('====================================\n');
      
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid webhook signature'
      });
    }

    console.log('✅ Webhook signature verified');
    console.log("Body:", JSON.stringify(req.body, null, 2));

    const event = req.body;

    // Handle based on event type
    switch (event.notificationType) {
      case "ENROLLMENT":
        await handleEnrollmentEvent(event);
        break;

      case "COMPLIANCE_REPORT":
        await handleComplianceEvent(event);
        break;

      case "STATUS_REPORT":
        await handleStatusEvent(event);
        break;

      case "COMMAND":
        await handleCommandEvent(event);
        break;

      default:
        console.log(`⚠️  Unknown event type: ${event.notificationType}`);
    }

    console.log("✅ Webhook processed successfully");
    console.log("====================================\n");

    return res.status(200).json({
      success: true,
      message: "Webhook received and processed",
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return res.status(500).json({
      success: false,
      error: "WEBHOOK_ERROR",
      message: error.message,
    });
  }
};

/**
 * Handle device enrollment event
 */
const handleEnrollmentEvent = async (event) => {
  console.log("\n📱 Processing ENROLLMENT event");

  const { deviceName, additionalData } = event;
  const customerId = additionalData; // We stored customer ID in enrollment token

  if (!customerId) {
    console.log("⚠️  No customer ID in enrollment data");
    return;
  }

  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      console.log("❌ Customer not found:", customerId);
      return;
    }

    // Update enrollment status
    customer.amapiEnrollment = {
      enrolled: true,
      deviceName,
      enrolledAt: new Date(),
      complianceStatus: "UNKNOWN",
    };

    await customer.save();
    console.log(`✅ Customer ${customer.fullName} enrolled successfully`);
  } catch (error) {
    console.error("❌ Error updating enrollment:", error);
  }
};

/**
 * Handle compliance report event
 */
const handleComplianceEvent = async (event) => {
  console.log("\n📊 Processing COMPLIANCE_REPORT event");

  const { deviceName, complianceState } = event;

  try {
    const customer = await Customer.findOne({
      "amapiEnrollment.deviceName": deviceName,
    });
    if (!customer) {
      console.log("⚠️  No customer found for device:", deviceName);
      return;
    }

    customer.amapiEnrollment.complianceStatus = complianceState || "UNKNOWN";
    customer.amapiEnrollment.lastPolicySync = new Date();

    await customer.save();
    console.log(
      `✅ Compliance updated for ${customer.fullName}: ${complianceState}`
    );
  } catch (error) {
    console.error("❌ Error updating compliance:", error);
  }
};

/**
 * Handle device status event
 */
const handleStatusEvent = async (event) => {
  console.log("\n📡 Processing STATUS_REPORT event");

  const { deviceName, statusReport } = event;

  try {
    const customer = await Customer.findOne({
      "amapiEnrollment.deviceName": deviceName,
    });
    if (!customer) {
      console.log("⚠️  No customer found for device:", deviceName);
      return;
    }

    // Update last policy sync time
    customer.amapiEnrollment.lastPolicySync = new Date();
    await customer.save();

    console.log(`✅ Status updated for ${customer.fullName}`);
  } catch (error) {
    console.error("❌ Error updating status:", error);
  }
};

/**
 * Handle command status event
 */
const handleCommandEvent = async (event) => {
  console.log("\n⚡ Processing COMMAND event");

  const { deviceName, commandType, commandStatus } = event;

  console.log(`Device: ${deviceName}`);
  console.log(`Command: ${commandType}`);
  console.log(`Status: ${commandStatus}`);

  // TODO: Update database based on command confirmation
  // e.g., if LOCK command succeeded, update isLocked field
};

module.exports = {
  handleAMAPIWebhook,
};
