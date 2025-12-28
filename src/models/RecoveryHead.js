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

// Text index for search functionality
recoveryHeadSchema.index({
    fullName: 'text',
    mobileNumber: 'text'
});

const RecoveryHead = mongoose.model('RecoveryHead', recoveryHeadSchema);

module.exports = RecoveryHead;
