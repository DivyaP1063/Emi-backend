const mongoose = require('mongoose');

const recoveryPersonSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    mobileNumber: {
        type: String,
        required: true,
        unique: true,
        match: /^[0-9]{10}$/
    },
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
    mobileVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    recoveryHeadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RecoveryHead',
        required: true
    },
    customers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    }]
}, {
    timestamps: true
});

// Create indexes
recoveryPersonSchema.index({ mobileNumber: 1 });
recoveryPersonSchema.index({ recoveryHeadId: 1 });
recoveryPersonSchema.index({ isActive: 1 });
recoveryPersonSchema.index({ pinCodes: 1 });
recoveryPersonSchema.index({ customers: 1 });

const RecoveryPerson = mongoose.model('RecoveryPerson', recoveryPersonSchema);

module.exports = RecoveryPerson;
