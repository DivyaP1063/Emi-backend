const mongoose = require('mongoose');

const retailerSchema = new mongoose.Schema({
  // Basic Info
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    match: /^[0-9]{10}$/
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },

  // Address
  address: {
    country: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },

  // Permissions
  permissions: {
    canPayEmiDownPayment: {
      type: Boolean,
      required: true,
      default: false
    },
    dpPending: {
      type: Boolean,
      required: true,
      default: false
    },
    autoLockDay: {
      type: Number,
      required: true,
      min: 1,
      default: 30
    },
    serverAadharVerify: {
      type: Boolean,
      required: true,
      default: true
    },
    allowElectronic: {
      type: Boolean,
      required: true,
      default: true
    },
    allowIPhone: {
      type: Boolean,
      required: true,
      default: false
    },
    allow8Month: {
      type: Boolean,
      required: true,
      default: true
    },
    allow4Month: {
      type: Boolean,
      required: true,
      default: false
    }
  },

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
retailerSchema.index({ mobileNumber: 1 }, { unique: true });
retailerSchema.index({ email: 1 }, { unique: true });
retailerSchema.index({ status: 1 });
retailerSchema.index({ 'address.city': 1 });
retailerSchema.index({ 'address.state': 1 });

// Text index for search functionality
retailerSchema.index({
  fullName: 'text',
  email: 'text',
  mobileNumber: 'text',
  shopName: 'text'
});

const Retailer = mongoose.model('Retailer', retailerSchema);

module.exports = Retailer;
