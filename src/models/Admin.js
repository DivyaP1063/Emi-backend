const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    match: /^[0-9]{10}$/
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    default: 'ADMIN'
  }
}, {
  timestamps: true
});

// Create index for faster queries
adminSchema.index({ mobileNumber: 1 });
adminSchema.index({ email: 1 });

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
