const { generateQRCode } = require('./qrCodeService');

/**
 * QR Provisioning Service
 * Generates QR codes for Android device provisioning with custom DPC
 */

/**
 * Ensure proper Base64 padding for checksums
 * Android 12+ requires strict Base64 format with proper padding
 * @param {string} checksum - Base64 checksum string
 * @returns {string} Properly padded Base64 checksum
 */
const ensureBase64Padding = (checksum) => {
    if (!checksum) return checksum;

    // Remove any existing padding
    let normalized = checksum.replace(/=+$/, '');

    // Add proper padding based on length
    // Base64 strings should be multiples of 4 characters
    const paddingNeeded = (4 - (normalized.length % 4)) % 4;
    normalized += '='.repeat(paddingNeeded);

    return normalized;
};

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
    const rawChecksum = process.env.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM || process.env.APP_SIGNATURE_CHECKSUM;

    // Ensure proper Base64 padding for Android 12+ compatibility
    const signatureChecksum = ensureBase64Padding(rawChecksum);
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
        // Android 12+ compatibility fields
        'android.app.extra.PROVISIONING_SKIP_ENCRYPTION': true,
        'android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED': true,
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

        // Log checksum info for debugging Android 12+ compatibility
        const rawChecksum = process.env.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM || process.env.APP_SIGNATURE_CHECKSUM;
        console.log(`🔐 Checksum (raw): ${rawChecksum} (length: ${rawChecksum?.length || 0})`);
        console.log(`🔐 Checksum (padded): ${payload['android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM']} (length: ${payload['android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM']?.length || 0})`);

        console.log('📦 QR Payload:');
        console.log(JSON.stringify(payload, null, 2));

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
