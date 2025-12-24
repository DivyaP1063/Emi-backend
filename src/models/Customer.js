const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  aadharNumber: {
    type: String,
    required: true,
    match: /^[0-9]{12}$/
  },
  dob: {
    type: Date,
    required: true
  },
  mobileNumber: {
    type: String,
    required: true,
    match: /^[0-9]{10}$/
  },
  mobileVerified: {
    type: Boolean,
    default: false
  },
  imei1: {
    type: String,
    required: true,
    match: /^[0-9]{15}$/
  },
  imei2: {
    type: String,
    match: /^[0-9]{15}$/,
    sparse: true
  },
  fatherName: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    village: {
      type: String,
      required: true
    },
    nearbyLocation: {
      type: String,
      required: true
    },
    post: {
      type: String,
      required: true
    },
    district: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true,
      match: /^[0-9]{6}$/
    }
  },
  documents: {
    customerPhoto: {
      type: String, // Cloudinary URL
      required: true
    },
    aadharFrontPhoto: {
      type: String, // Cloudinary URL
      required: true
    },
    aadharBackPhoto: {
      type: String, // Cloudinary URL
      required: true
    },
    signaturePhoto: {
      type: String, // Cloudinary URL
      required: true
    }
  },
  emiDetails: {
    branch: {
      type: String,
      required: true,
      trim: true
    },
    phoneType: {
      type: String,
      required: true,
      enum: ['NEW', 'OLD'],
      uppercase: true
    },
    model: {
      type: String,
      required: true,
      trim: true
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    sellPrice: {
      type: Number,
      required: true,
      min: 0
    },
    landingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    downPayment: {
      type: Number,
      required: true,
      min: 0
    },
    downPaymentPending: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    emiRate: {
      type: Number,
      required: true,
      default: 3,
      min: 0
    },
    numberOfMonths: {
      type: Number,
      required: true,
      min: 1
    },
    emiMonths: [{
      month: {
        type: Number,
        required: true
      },
      dueDate: {
        type: Date,
        required: true
      },
      paid: {
        type: Boolean,
        default: false
      },
      paidDate: {
        type: Date
      },
      amount: {
        type: Number,
        required: true
      }
    }],
    balanceAmount: {
      type: Number,
      required: true,
      min: 0
    },
    emiPerMonth: {
      type: Number,
      required: true,
      min: 0
    },
    totalEmiAmount: {
      type: Number,
      required: true,
      min: 0
    }
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  fcmToken: {
    type: String,
    default: null,
    trim: true
  },
  devicePin: {
    type: String,
    default: null,
    trim: true,
    match: /^[0-9]{4,6}$/
  },
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    lastUpdated: {
      type: Date
    }
  },
  retailerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Retailer',
    required: true
  },
  assigned: {
    type: Boolean,
    default: false
  },
  assignedTo: {
    type: String,
    default: null,
    trim: true
  },
  assignedToRecoveryHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecoveryHead',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Create indexes
customerSchema.index({ mobileNumber: 1, retailerId: 1 });
customerSchema.index({ aadharNumber: 1 });
customerSchema.index({ imei1: 1 }, { unique: true });
customerSchema.index({ imei2: 1 }, { unique: true, sparse: true });
customerSchema.index({ assigned: 1 });
customerSchema.index({ assignedToRecoveryHeadId: 1 });
customerSchema.index({ isLocked: 1, assigned: 1 });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
