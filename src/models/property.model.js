const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope.plugin');

const PropertySchema = new mongoose.Schema({
  tenants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  }],
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a property name'],
    trim: true,
    maxlength: [100, 'Property name cannot be more than 100 characters']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Please add street address'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'Please add city'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'Please add state'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'Please add zip code'],
      trim: true
    },
    country: {
      type: String,
      default: 'USA',
      trim: true
    },
    fullAddress: {
      type: String,
      trim: true
    }
  },
  size: {
    value: {
      type: Number,
      required: [true, 'Please add property size']
    },
    unit: {
      type: String,
      enum: ['sqft', 'acres', 'sqm'],
      default: 'sqft'
    }
  },
  propertyType: {
    type: String,
    enum: ['residential', 'commercial', 'industrial', 'agricultural'],
    default: 'residential'
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  features: {
    hasFrontYard: {
      type: Boolean,
      default: true
    },
    hasBackYard: {
      type: Boolean,
      default: true
    },
    hasTrees: {
      type: Boolean,
      default: false
    },
    hasGarden: {
      type: Boolean,
      default: false
    },
    hasSprinklerSystem: {
      type: Boolean,
      default: false
    },
    // hasPool: {
    //   type: Boolean,
    //   default: false
    // },
    // hasDeck: {
    //   type: Boolean,
    //   default: false
    // },
    // hasPatio: {
    //   type: Boolean,
    //   default: false
    // },
    // hasFence: {
    //   type: Boolean,
    //   default: false
    // },
    // hasIrrigation: {
    //   type: Boolean,
    //   default: false
    // }
  },
  accessInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Access instructions cannot be more than 500 characters']
  },
  specialRequirements: {
    type: String,
    trim: true,
    maxlength: [1000, 'Special requirements cannot be more than 1000 characters']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to automatically generate fullAddress
PropertySchema.pre('save', function(next) {
  if (this.address.street && this.address.city && this.address.state && this.address.zipCode) {
    this.address.fullAddress = `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}, ${this.address.country}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Pre-update middleware to automatically generate fullAddress on updates
PropertySchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.address && update.address.street && update.address.city && update.address.state && update.address.zipCode) {
    update.address.fullAddress = `${update.address.street}, ${update.address.city}, ${update.address.state} ${update.address.zipCode}, ${update.address.country}`;
  }
  update.updatedAt = Date.now();
  next();
});

// Add indexes for better performance
PropertySchema.index({ customer: 1 });
PropertySchema.index({ user: 1 });
PropertySchema.index({ tenants: 1 });
PropertySchema.index({ isDefault: 1 });
PropertySchema.index({ status: 1 });
PropertySchema.index({ createdAt: -1 });

// Apply tenant scope plugin
PropertySchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Property', PropertySchema);
