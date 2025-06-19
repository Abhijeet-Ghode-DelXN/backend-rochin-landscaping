const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope.plugin');

const ServiceSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please add a service name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: [
      'Lawn Maintenance',
      'Gardening',
      'Tree Service',
      'Landscaping Design',
      'Irrigation',
      'Seasonal',
      'Residential',
      'Other'
    ]
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Please add estimated service duration']
  },
  basePrice: {
    type: Number,
    required: [true, 'Please add base price']
  },
  priceUnit: {
    type: String,
    enum: ['flat', 'hourly', 'per_sqft'],
    default: 'flat'
  },
  recurringOptions: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequencies: [{
      type: String,
      enum: ['One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annually']
    }],
    discounts: {
      Weekly: {
        type: Number,
        default: 10 // 10% discount
      },
      'Bi-weekly': {
        type: Number,
        default: 5 // 5% discount
      },
      Monthly: {
        type: Number,
        default: 3 // 3% discount
      },
      Quarterly: {
        type: Number,
        default: 2 // 2% discount
      },
      Annually: {
        type: Number,
        default: 15 // 15% discount
      }
    }
  },
  packages: [{
    name: {
      type: String,
      required: true,
      enum: ['Basic', 'Standard', 'Premium']
    },
    description: {
      type: String,
      required: true
    },
    additionalFeatures: [{
      type: String
    }],
    priceMultiplier: {
      type: Number,
      default: 1
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  // image: {
  //   type: String,
  //   default: 'no-photo.jpg'
  // },
  image: {
    url: { type: String },
    publicId: { type: String }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ServiceSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Service', ServiceSchema); 