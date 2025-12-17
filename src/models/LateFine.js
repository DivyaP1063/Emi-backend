const mongoose = require('mongoose');

const lateFineSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false
    }
}, {
    timestamps: true
});

// Ensure only one document exists (singleton pattern)
lateFineSchema.statics.getSetting = async function () {
    let setting = await this.findOne();
    if (!setting) {
        setting = await this.create({ amount: 0 });
    }
    return setting;
};

lateFineSchema.statics.updateSetting = async function (amount, adminId) {
    let setting = await this.findOne();
    if (!setting) {
        setting = await this.create({ amount, updatedBy: adminId });
    } else {
        setting.amount = amount;
        setting.updatedBy = adminId;
        await setting.save();
    }
    return setting;
};

const LateFine = mongoose.model('LateFine', lateFineSchema);

module.exports = LateFine;
