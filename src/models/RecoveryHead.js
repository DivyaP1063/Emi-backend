const mongoose = require('mongoose');

const recoveryHeadSchema = new mongoose.Schema({
    // Basic Info
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    mobileNumber: {
        type: String,
        required: true,
        match: /^[0-9]{10}$/
    },

    // Assigned Pin Codes
    pinCodes: {
        type: [String],
        required: true,
        validate: {
            validator: function (pinCodes) {
                // Must have at least one pin code
                if (pinCodes.length === 0) return false;
                // Each pin code must be exactly 6 digits
                return pinCodes.every(pin => /^[0-9]{6}$/.test(pin));
            },
            message: 'Each pin code must be exactly 6 digits and at least one pin code is required'
        }
    },

    // Status
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE'
    }
}, {
    timestamps: true
});

// Create indexes for faster queries
recoveryHeadSchema.index({ mobileNumber: 1 }, { unique: true });
recoveryHeadSchema.index({ status: 1 });
recoveryHeadSchema.index({ pinCodes: 1 });

// Text index for search functionality
recoveryHeadSchema.index({
    fullName: 'text',
    mobileNumber: 'text'
});

const RecoveryHead = mongoose.model('RecoveryHead', recoveryHeadSchema);

module.exports = RecoveryHead;
