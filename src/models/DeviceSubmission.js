const mongoose = require('mongoose');

const deviceSubmissionSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    recoveryPersonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RecoveryPerson',
        required: true
    },
    stockistId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stockist',
        required: true
    },
    submittedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    paymentDeadline: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['PENDING', 'RETURNED_TO_CUSTOMER', 'SENT_TO_REPAIR', 'SENT_TO_RESELL'],
        default: 'PENDING'
    },

    // Customer retrieval details
    customerRetrievalInfo: {
        retrievedAt: {
            type: Date,
            default: null
        },
        amountPaid: {
            type: Number,
            min: 0,
            default: null
        },
        paymentMethod: {
            type: String,
            enum: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'],
            default: null
        },
        notes: {
            type: String,
            trim: true,
            default: null
        }
    },

    // Repair details
    repairInfo: {
        sentToRepairAt: {
            type: Date,
            default: null
        },
        estimatedCost: {
            type: Number,
            min: 0,
            default: null
        },
        repairVendor: {
            type: String,
            trim: true,
            default: null
        },
        repairNotes: {
            type: String,
            trim: true,
            default: null
        }
    },

    // Resell details
    resellInfo: {
        sentToResellAt: {
            type: Date,
            default: null
        },
        estimatedValue: {
            type: Number,
            min: 0,
            default: null
        },
        resellPlatform: {
            type: String,
            trim: true,
            default: null
        },
        resellNotes: {
            type: String,
            trim: true,
            default: null
        }
    },

    actionTakenAt: {
        type: Date,
        default: null
    },
    actionTakenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stockist',
        default: null
    }
}, {
    timestamps: true
});

// Create indexes for efficient queries
deviceSubmissionSchema.index({ customerId: 1 });
deviceSubmissionSchema.index({ stockistId: 1 });
deviceSubmissionSchema.index({ recoveryPersonId: 1 });
deviceSubmissionSchema.index({ status: 1 });
deviceSubmissionSchema.index({ paymentDeadline: 1 });
deviceSubmissionSchema.index({ submittedAt: 1 });
// Compound index for stockist dashboard queries
deviceSubmissionSchema.index({ stockistId: 1, status: 1 });
deviceSubmissionSchema.index({ stockistId: 1, paymentDeadline: 1 });

const DeviceSubmission = mongoose.model('DeviceSubmission', deviceSubmissionSchema);

module.exports = DeviceSubmission;
