const mongoose = require('mongoose');

const accountantSchema = new mongoose.Schema({
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
    }
}, {
    timestamps: true
});

// Create indexes
accountantSchema.index({ mobileNumber: 1 });
accountantSchema.index({ aadharNumber: 1 });

const Accountant = mongoose.model('Accountant', accountantSchema);

module.exports = Accountant;
