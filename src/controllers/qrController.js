const { generateProvisioningQR } = require('../services/qrProvisioningService');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');

/**
 * Generate QR Code for Customer Device Provisioning
 * POST /api/admin/qr/:customerId
 */
const generateCustomerQR = async (req, res) => {
    try {
        const { customerId } = req.params;

        console.log('\n🎫 ===== ADMIN: GENERATE QR CODE =====');
        console.log(`Customer ID: ${customerId}`);

        // Find customer
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'CUSTOMER_NOT_FOUND',
                message: 'Customer not found'
            });
        }

        // Get FRP UserId from admin (optional)
        const admin = await Admin.findOne({ 
            isActive: true, 
            googleUserId: { $ne: null } 
        }).select('googleUserId').lean();
        const frpUserId = admin?.googleUserId || '';

        // Generate provisioning QR
        const qrResult = await generateProvisioningQR(customerId, frpUserId, 512);

        if (!qrResult.success) {
            return res.status(500).json({
                success: false,
                error: 'QR_GENERATION_FAILED',
                message: qrResult.error
            });
        }

        console.log('✅ QR Code generated successfully');
        console.log('====================================\n');

        return res.status(200).json({
            success: true,
            message: 'QR code generated successfully',
            data: {
                customerId,
                customerName: customer.fullName,
                qrCode: qrResult.qrCode,
                payload: qrResult.payload
            }
        });
    } catch (error) {
        console.error('❌ Generate QR error:', error);
        return res.status(500).json({
            success: false,
            error: 'SERVER_ERROR',
            message: error.message
        });
    }
};

module.exports = {
    generateCustomerQR
};
