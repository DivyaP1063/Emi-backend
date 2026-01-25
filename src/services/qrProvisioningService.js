const { generateQRCode } = require('./qrCodeService');

/**
 * QR Provisioning Service
 * Generates QR codes for Android device provisioning with custom DPC
 */

/**
 * Build provisioning payload for QR code
 * This payload tells Android to install our DPC app and pass extras to it
 * @param {string} customerId - Customer ID
 * @param {string} frpUserId - Factory Reset Protection user ID (optional)
 * @returns {object} Provisioning payload
 */
const buildProvisioningPayload = (customerId, frpUserId = '') => {
    const componentName = process.env.DPC_COMPONENT_NAME || 'com.mdmandroid/.receiver.DeviceAdminReceiver';
    const downloadUrl = process.env.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION || process.env.APP_DOWNLOAD_URL;
    const signatureChecksum = process.env.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM || process.env.APP_SIGNATURE_CHECKSUM;
    const backendUrl = process.env.BACKEND_URL;

    if (!downloadUrl) {
        throw new Error('PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION is not configured');
    }
    if (!signatureChecksum) {
        throw new Error('PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM is not configured');
    }

    const payload = {
        'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME': componentName,
        'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION': downloadUrl,
        'android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM': signatureChecksum,
        'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE': {
            backend_url: backendUrl,
            customer_id: customerId
        }
    };

    // Add FRP user ID if provided
    if (frpUserId) {
        payload['android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE'].frpUserId = frpUserId;
    }

    return payload;
};

/**
 * Generate provisioning QR code for a customer
 * @param {string} customerId - Customer ID
 * @param {string} frpUserId - Factory Reset Protection user ID (optional)
 * @param {number} size - QR code size in pixels (default: 512)
 * @returns {Promise<object>} QR code result
 */
const generateProvisioningQR = async (customerId, frpUserId = '', size = 512) => {
    try {
        console.log('\n📱 ===== GENERATING PROVISIONING QR =====');
        console.log(`Customer ID: ${customerId}`);
        console.log(`FRP User ID: ${frpUserId || 'Not provided'}`);

        // Build the provisioning payload
        const payload = buildProvisioningPayload(customerId, frpUserId);

        console.log('Payload built successfully');

        // Generate QR code
        const qrResult = await generateQRCode(payload, size);

        if (!qrResult.success) {
            console.error('❌ QR generation failed:', qrResult.error);
            return qrResult;
        }

        console.log('✅ Provisioning QR generated successfully');
        console.log('==========================================\n');

        return {
            success: true,
            qrCode: qrResult.qrCode,
            payload,
            size
        };
    } catch (error) {
        console.error('❌ Error generating provisioning QR:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    buildProvisioningPayload,
    generateProvisioningQR
};
