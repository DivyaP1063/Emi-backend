const mongoose = require('mongoose');

const emiInstallmentSchema = new mongoose.Schema({
  installmentNumber: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'],
    default: 'PENDING'
  },
  paidDate: {
    type: Date
  },
  paidAmount: {
    type: Number
  }
});

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  retailerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Retailer',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  emiDetails: {
    emiMonth: {
      type: Number,
      required: true,
      enum: [4, 8]
    },
    downPayment: {
      type: Number,
      required: true,
      min: 0
    },
    emiAmount: {
      type: Number,
      required: true,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    startDate: {
      type: Date,
      required: true
    }
  },
  emiSchedule: [emiInstallmentSchema],
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

// Create indexes
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ retailerId: 1 });
transactionSchema.index({ customerId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ 'emiSchedule.dueDate': 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
