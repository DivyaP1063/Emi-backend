const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productType: {
    type: String,
    required: true,
    enum: ['ELECTRONIC', 'IPHONE', 'OTHER']
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  imei1: {
    type: String,
    required: true,
    unique: true,
    match: /^[0-9]{15}$/
  },
  imei2: {
    type: String,
    unique: true,
    sparse: true,
    match: /^[0-9]{15}$/
  },
  serialNumber: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
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
productSchema.index({ imei1: 1 });
productSchema.index({ imei2: 1 });
productSchema.index({ retailerId: 1 });
productSchema.index({ productType: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
