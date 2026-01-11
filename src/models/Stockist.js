const mongoose = require('mongoose');

const stockistSchema = new mongoose.Schema({
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
    shopName: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        street: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            required: true,
            trim: true
        },
        pincode: {
            type: String,
            required: true,
            match: /^[0-9]{6}$/
        }
    },
    pinCodes: {
        type: [String],
        default: [],
        validate: {
            validator: function (pinCodes) {
                // Each pin code must be exactly 6 digits
                return pinCodes.every(pin => /^[0-9]{6}$/.test(pin));
            },
            message: 'Each pin code must be exactly 6 digits'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    mobileVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Create indexes
stockistSchema.index({ mobileNumber: 1 });
stockistSchema.index({ isActive: 1 });
stockistSchema.index({ pinCodes: 1 });

const Stockist = mongoose.model('Stockist', stockistSchema);

module.exports = Stockist;
