const mongoose = require('mongoose');

const emiPlanSchema = new mongoose.Schema({
    planName: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    monthlyRates: [{
        month: {
            type: Number,
            required: true,
            min: 1
        },
        rate: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Validate that months are sequential starting from 1
emiPlanSchema.pre('save', function (next) {
    if (this.monthlyRates && this.monthlyRates.length > 0) {
        // Sort by month number
        this.monthlyRates.sort((a, b) => a.month - b.month);

        // Check if months are sequential starting from 1
        for (let i = 0; i < this.monthlyRates.length; i++) {
            if (this.monthlyRates[i].month !== i + 1) {
                return next(new Error('Monthly rates must be sequential starting from month 1'));
            }
        }
    }
    next();
});

// Create indexes
emiPlanSchema.index({ planName: 1 });
emiPlanSchema.index({ isActive: 1 });
emiPlanSchema.index({ planName: 'text' });

const EmiPlan = mongoose.model('EmiPlan', emiPlanSchema);

module.exports = EmiPlan;
