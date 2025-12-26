const QRCode = require('qrcode');

/**
 * QR Code Generation Service
 * Generates QR codes for Android Enterprise device provisioning
 */

/**
 * Generate QR code from provisioning payload
 * @param {object} payload - Provisioning data
 * @param {number} size - QR code size in pixels (default: 512)
 * @returns {Promise<string>} Base64 data URL of QR code image
 */
const generateQRCode = async (payload, size = 512) => {
    try {
        console.log('\n📱 ===== GENERATING QR CODE =====');
        console.log('Payload:', JSON.stringify(payload, null, 2));

        // Convert payload to JSON string
        const payloadString = JSON.stringify(payload);

        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(payloadString, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: size,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        console.log('✅ QR Code generated successfully');
        console.log(`Size: ${size}x${size}px`);
        console.log('================================\n');

        return {
            success: true,
            qrCode: qrDataUrl,
            size,
            format: 'data:image/png;base64'
        };

    } catch (error) {
        console.error('❌ Error generating QR code:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Generate QR code as buffer (for file saving)
 * @param {object} payload - Provisioning data
 * @param {number} size - QR code size in pixels
 * @returns {Promise<Buffer>} QR code image buffer
 */
const generateQRCodeBuffer = async (payload, size = 512) => {
    try {
        const payloadString = JSON.stringify(payload);

        const buffer = await QRCode.toBuffer(payloadString, {
            errorCorrectionLevel: 'M',
            type: 'png',
            width: size,
            margin: 2
        });

        return {
            success: true,
            buffer,
            size
        };

    } catch (error) {
        console.error('❌ Error generating QR code buffer:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    generateQRCode,
    generateQRCodeBuffer
};
