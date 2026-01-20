const mongoose = require('mongoose');

const phoneModelSchema = new mongoose.Schema({
    brandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: true
    },
    modelName: {
        type: String,
        required: true,
        trim: true
    },
    images: [{
        type: String, // Cloudinary URLs
        validate: {
            validator: function (v) {
                return this.images.length <= 5;
            },
            message: 'Maximum 5 images allowed'
        }
    }],
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
phoneModelSchema.index({ brandId: 1 });
phoneModelSchema.index({ modelName: 1 });
phoneModelSchema.index({ isActive: 1 });
phoneModelSchema.index({ brandId: 1, isActive: 1 }); // Compound index for active models by brand

const PhoneModel = mongoose.model('PhoneModel', phoneModelSchema);

module.exports = PhoneModel;
