const mongoose = require('mongoose');

const pincodeSchema = new mongoose.Schema(
    {
        pincode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            match: /^[0-9]{6}$/
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Create indexes for faster queries
pincodeSchema.index({ pincode: 1 }, { unique: true });
pincodeSchema.index({ isActive: 1 });

const Pincode = mongoose.model('Pincode', pincodeSchema);

module.exports = Pincode;
