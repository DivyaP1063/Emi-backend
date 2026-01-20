const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    logo: {
        type: String, // Cloudinary URL
        default: null
    },
    description: {
        type: String,
        trim: true,
        default: null
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
brandSchema.index({ name: 1 });
brandSchema.index({ isActive: 1 });
brandSchema.index({ createdBy: 1 });

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;
