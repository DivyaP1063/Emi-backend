const mongoose = require('mongoose');

const recoveryHeadAssignmentSchema = new mongoose.Schema({
    // Recovery Head Information
    recoveryHeadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RecoveryHead',
        required: true
    },
    recoveryHeadName: {
        type: String,
        required: true,
        trim: true
    },

    // Recovery Person Information
    recoveryPersonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RecoveryPerson',
        required: true
    },
    recoveryPersonName: {
        type: String,
        required: true,
        trim: true
    },

    // Customer Information
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    customerName: {
        type: String,
        required: true,
        trim: true
    },

    // Assignment Status
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE'
    },

    // Assignment Metadata
    assignedAt: {
        type: Date,
        default: Date.now
    },
    unassignedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Create compound indexes for efficient queries
recoveryHeadAssignmentSchema.index({ recoveryHeadId: 1, status: 1 });
recoveryHeadAssignmentSchema.index({ recoveryPersonId: 1, status: 1 });
recoveryHeadAssignmentSchema.index({ customerId: 1, status: 1 });
recoveryHeadAssignmentSchema.index({ recoveryHeadId: 1, recoveryPersonId: 1 });
recoveryHeadAssignmentSchema.index({ recoveryHeadId: 1, customerId: 1 });

// Ensure a customer can only be actively assigned to one recovery person at a time
recoveryHeadAssignmentSchema.index(
    { customerId: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: 'ACTIVE' }
    }
);

const RecoveryHeadAssignment = mongoose.model('RecoveryHeadAssignment', recoveryHeadAssignmentSchema);

module.exports = RecoveryHeadAssignment;
