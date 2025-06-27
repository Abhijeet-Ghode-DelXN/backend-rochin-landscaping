const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope.plugin');

const EstimateSchema = new mongoose.Schema({
  tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
  services: [{
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    }
  }],
  property: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    size: Number, // in square feet
    details: String
  },
  photos: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    category: {
      type: String,
      enum: ['Front Yard', 'Back Yard', 'Side Yard', 'Other'],
      default: 'Other'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerNotes: {
    type: String
  },
  budget: {
    min: Number,
    max: Number
  },
  accessInfo: {
    type: String
  },
  packages: [{
    name: {
      type: String,
      enum: ['Basic', 'Standard', 'Premium'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    lineItems: [{
      service: {
        type: String,
        required: true
      },
      description: String,
      unitPrice: Number,
      quantity: Number,
      totalPrice: Number
    }],
    subTotal: Number,
    tax: Number,
    discount: {
      amount: Number,
      description: String
    },
    total: {
      type: Number,
      required: true
    },
    notes: String
  }],
  status: {
    type: String,
    enum: ['Requested', 'In Review', 'Prepared', 'Sent', 'Approved', 'Declined', 'Expired'],
    default: 'Requested'
  },
  approvedPackage: {
    type: String,
    enum: ['Basic', 'Standard', 'Premium']
  },
  expiryDate: {
    type: Date
  },
  deposit: {
    required: {
      type: Boolean,
      default: false
    },
    amount: Number,
    paymentId: String,
    paidOn: Date
  },
  estimateNumber: {
    type: String,
    unique: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create estimate number before saving
EstimateSchema.pre('save', async function(next) {
  if (!this.estimateNumber) {
    const count = await this.constructor.countDocuments();
    const date = new Date();
    this.estimateNumber = `EST-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

EstimateSchema.plugin(tenantScopePlugin);

EstimateSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Estimate', EstimateSchema); 