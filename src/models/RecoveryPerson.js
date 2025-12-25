const mongoose = require('mongoose');

const recoveryPersonSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    aadharNumber: {
        type: String,
        required: true,
        unique: true,
        match: /^[0-9]{12}$/
    },
    mobileNumber: {
        type: String,
        required: true,
        unique: true,
        match: /^[0-9]{10}$/
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
    }
}, {
    timestamps: true
});

// Create indexes
recoveryPersonSchema.index({ mobileNumber: 1 });
recoveryPersonSchema.index({ aadharNumber: 1 });
recoveryPersonSchema.index({ recoveryHeadId: 1 });
recoveryPersonSchema.index({ isActive: 1 });

const RecoveryPerson = mongoose.model('RecoveryPerson', recoveryPersonSchema);

module.exports = RecoveryPerson;
