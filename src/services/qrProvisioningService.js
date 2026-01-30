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
    console.log('\n🔧 ===== BASE64 PADDING PROCESS =====');
    console.log(`📥 Input checksum: "${checksum}"`);
    console.log(`📏 Input length: ${checksum?.length || 0} characters`);

    if (!checksum) {
        console.log('⚠️  No checksum provided, returning as-is');
        console.log('=====================================\n');
        return checksum;
    }

    // Remove any existing padding
    let normalized = checksum.replace(/=+$/, '');
    const removedPadding = checksum.length - normalized.length;
    console.log(`🧹 Removed ${removedPadding} existing padding character(s)`);
    console.log(`📏 Normalized length: ${normalized.length} characters`);

    // Add proper padding based on length
    // Base64 strings should be multiples of 4 characters
    const remainder = normalized.length % 4;
    const paddingNeeded = (4 - remainder) % 4;
    console.log(`🔢 Length modulo 4: ${remainder}`);
    console.log(`➕ Padding needed: ${paddingNeeded} character(s)`);

    normalized += '='.repeat(paddingNeeded);

    console.log(`📤 Output checksum: "${normalized}"`);
    console.log(`📏 Output length: ${normalized.length} characters`);
    console.log(`✅ Checksum is now properly padded (length % 4 = ${normalized.length % 4})`);
    console.log('=====================================\n');

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
    console.log('\n🏗️  ===== BUILDING PROVISIONING PAYLOAD =====');
    console.log(`📋 Customer ID: ${customerId}`);
    console.log(`📋 FRP User ID: ${frpUserId || '(not provided)'}`);

    console.log('\n🌍 ENVIRONMENT VARIABLES:');
    console.log('─────────────────────────────────────────');

    // Component Name
    const componentName = process.env.DPC_COMPONENT_NAME || 'com.mdmandroid/.receiver.DeviceAdminReceiver';
    console.log(`📱 DPC_COMPONENT_NAME:`);
    console.log(`   Raw value: ${process.env.DPC_COMPONENT_NAME || '(not set)'}`);
    console.log(`   Using: ${componentName}`);
    console.log(`   Source: ${process.env.DPC_COMPONENT_NAME ? 'ENV' : 'DEFAULT'}`);

    // Download URL
    const downloadUrl = process.env.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION || process.env.APP_DOWNLOAD_URL;
    console.log(`\n📦 Download URL:`);
    console.log(`   PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION: ${process.env.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION || '(not set)'}`);
    console.log(`   APP_DOWNLOAD_URL (fallback): ${process.env.APP_DOWNLOAD_URL || '(not set)'}`);
    console.log(`   Using: ${downloadUrl || '(MISSING!)'}`);
    console.log(`   Source: ${process.env.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION ? 'PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION' : process.env.APP_DOWNLOAD_URL ? 'APP_DOWNLOAD_URL' : 'NONE'}`);

    // Checksum
    const rawChecksum = process.env.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM || process.env.APP_SIGNATURE_CHECKSUM;
    console.log(`\n🔐 Signature Checksum:`);
    console.log(`   PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM: ${process.env.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM || '(not set)'}`);
    console.log(`   APP_SIGNATURE_CHECKSUM (fallback): ${process.env.APP_SIGNATURE_CHECKSUM || '(not set)'}`);
    console.log(`   Raw checksum: "${rawChecksum || '(MISSING!)'}"`);
    console.log(`   Raw length: ${rawChecksum?.length || 0} characters`);
    console.log(`   Source: ${process.env.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM ? 'PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM' : process.env.APP_SIGNATURE_CHECKSUM ? 'APP_SIGNATURE_CHECKSUM' : 'NONE'}`);

    // Ensure proper Base64 padding for Android 12+ compatibility
    const signatureChecksum = ensureBase64Padding(rawChecksum);

    // Backend URL
    const backendUrl = process.env.BACKEND_URL;
    console.log(`\n🌐 Backend URL:`);
    console.log(`   BACKEND_URL: ${backendUrl || '(not set)'}`);
    console.log(`   Using: ${backendUrl || '(MISSING!)'}`);

    console.log('\n─────────────────────────────────────────');

    // Validation
    if (!downloadUrl) {
        console.error('❌ CRITICAL ERROR: PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION is not configured');
        throw new Error('PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION is not configured');
    }
    if (!signatureChecksum) {
        console.error('❌ CRITICAL ERROR: PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM is not configured');
        throw new Error('PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM is not configured');
    }

    console.log('\n✅ All required environment variables are present');
    console.log('\n🔨 CONSTRUCTING PAYLOAD:');
    console.log('─────────────────────────────────────────');

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

    console.log(`✓ Component Name: ${componentName}`);
    console.log(`✓ Download Location: ${downloadUrl}`);
    console.log(`✓ Signature Checksum: "${signatureChecksum}" (${signatureChecksum.length} chars)`);
    console.log(`✓ Skip Encryption: true`);
    console.log(`✓ Leave System Apps Enabled: true`);
    console.log(`✓ Admin Extras Bundle:`);
    console.log(`  - backend_url: ${backendUrl}`);
    console.log(`  - customer_id: ${customerId}`);

    // Add FRP user ID if provided
    if (frpUserId) {
        payload['android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE'].frpUserId = frpUserId;
        console.log(`  - frpUserId: ${frpUserId}`);
    }

    console.log('\n📦 COMPLETE PAYLOAD OBJECT:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('=============================================\n');

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
    const startTime = Date.now();

    try {
        console.log('\n\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📱 QR PROVISIONING SERVICE - GENERATION REQUEST');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
        console.log(`📋 Request Parameters:`);
        console.log(`   - Customer ID: ${customerId}`);
        console.log(`   - FRP User ID: ${frpUserId || '(not provided)'}`);
        console.log(`   - QR Size: ${size}px`);
        console.log('───────────────────────────────────────────────────────────\n');

        // Build the provisioning payload
        console.log('🔄 STEP 1: Building provisioning payload...\n');
        const payload = buildProvisioningPayload(customerId, frpUserId);

        console.log('🔄 STEP 2: Generating QR code from payload...\n');
        console.log(`📊 Payload size: ${JSON.stringify(payload).length} bytes`);

        // Generate QR code
        const qrResult = await generateQRCode(payload, size);

        if (!qrResult.success) {
            console.error('\n❌ QR GENERATION FAILED');
            console.error(`   Error: ${qrResult.error}`);
            console.error('═══════════════════════════════════════════════════════════\n\n');
            return qrResult;
        }

        const duration = Date.now() - startTime;

        console.log('✅ QR CODE GENERATED SUCCESSFULLY');
        console.log('───────────────────────────────────────────────────────────');
        console.log(`⏱️  Generation time: ${duration}ms`);
        console.log(`📏 QR code size: ${size}x${size}px`);
        console.log(`🔐 Final checksum in payload: "${payload['android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM']}"`);
        console.log(`📏 Final checksum length: ${payload['android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM']?.length || 0} characters`);
        console.log('═══════════════════════════════════════════════════════════\n\n');

        return {
            success: true,
            qrCode: qrResult.qrCode,
            payload,
            size
        };
    } catch (error) {
        const duration = Date.now() - startTime;

        console.error('\n\n');
        console.error('═══════════════════════════════════════════════════════════');
        console.error('❌ QR PROVISIONING SERVICE - ERROR');
        console.error('═══════════════════════════════════════════════════════════');
        console.error(`⏰ Timestamp: ${new Date().toISOString()}`);
        console.error(`⏱️  Failed after: ${duration}ms`);
        console.error(`📋 Customer ID: ${customerId}`);
        console.error(`🔴 Error Type: ${error.name}`);
        console.error(`🔴 Error Message: ${error.message}`);
        console.error(`🔴 Stack Trace:`);
        console.error(error.stack);
        console.error('═══════════════════════════════════════════════════════════\n\n');

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
