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
    match: /^[0-9]{15}$/,
    unique: true
  },
  imei2: {
    type: String,
    match: /^[0-9]{15}$/,
    sparse: true,
    unique: true
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
  retailerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Retailer',
    required: true
  }
}, {
  timestamps: true
});

// Create indexes
customerSchema.index({ mobileNumber: 1, retailerId: 1 });
customerSchema.index({ aadharNumber: 1 });
customerSchema.index({ imei1: 1 });
customerSchema.index({ imei2: 1 });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
