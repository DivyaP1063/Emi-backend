const mongoose = require('mongoose');

const phoneVariantSchema = new mongoose.Schema({
    phoneModelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhoneModel',
        required: true
    },
    ram: {
        type: Number,
        required: true,
        min: 1 // in GB
    },
    rom: {
        type: Number,
        required: true,
        min: 1 // in GB
    },
    color: {
        type: String,
        trim: true,
        default: null
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    mrp: {
        type: Number,
        min: 0,
        default: null
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true
});

// Create indexes
phoneVariantSchema.index({ phoneModelId: 1 });
phoneVariantSchema.index({ isActive: 1 });
phoneVariantSchema.index({ phoneModelId: 1, isActive: 1 }); // Compound index for active variants by model
phoneVariantSchema.index({ sku: 1 });
phoneVariantSchema.index({ price: 1 });

const PhoneVariant = mongoose.model('PhoneVariant', phoneVariantSchema);

module.exports = PhoneVariant;
