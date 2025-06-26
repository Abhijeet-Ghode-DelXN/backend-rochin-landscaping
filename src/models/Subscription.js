const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  plan: {
    type: String,
    required: true,
    enum: ['basic', 'premium', 'enterprise', 'custom']
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'suspended', 'cancelled', 'past_due', 'trialing'],
    default: 'active'
  },
  billingCycle: {
    type: String,
    required: true,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  nextBillingDate: {
    type: Date,
    required: true
  },
  trialEndDate: {
    type: Date,
    default: null
  },
  features: {
    users: {
      limit: { type: Number, default: 5 },
      used: { type: Number, default: 0 }
    },
    appointments: {
      limit: { type: Number, default: 100 },
      used: { type: Number, default: 0 }
    },
    customers: {
      limit: { type: Number, default: 200 },
      used: { type: Number, default: 0 }
    },
    storage: {
      limit: { type: Number, default: 1024 }, // MB
      used: { type: Number, default: 0 }
    },
    support: {
      type: String,
      enum: ['email', 'priority', '24_7'],
      default: 'email'
    }
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_transfer', 'paypal'],
      default: 'card'
    },
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'failed', 'refunded'],
    default: 'pending'
  },
  lastPaymentDate: {
    type: Date,
    default: null
  },
  nextPaymentAmount: {
    type: Number,
    required: true
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  cancellationReason: {
    type: String,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  notes: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient querying
SubscriptionSchema.index({ tenantId: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ plan: 1 });
SubscriptionSchema.index({ nextBillingDate: 1 });
SubscriptionSchema.index({ paymentStatus: 1 });
SubscriptionSchema.index({ endDate: 1 });

// Static method to create subscription
SubscriptionSchema.statics.createSubscription = function(data) {
  const { tenantId, plan, billingCycle, amount, currency, trialDays = 0 } = data;
  
  const startDate = new Date();
  const trialEndDate = trialDays > 0 ? new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;
  const endDate = new Date(startDate.getTime() + getBillingCycleDays(billingCycle) * 24 * 60 * 60 * 1000);
  const nextBillingDate = trialEndDate || endDate;

  return this.create({
    tenantId,
    plan,
    billingCycle,
    amount,
    currency,
    startDate,
    endDate,
    nextBillingDate,
    trialEndDate,
    nextPaymentAmount: amount,
    features: getPlanFeatures(plan)
  });
};

// Static method to get active subscriptions
SubscriptionSchema.statics.getActiveSubscriptions = function() {
  return this.find({
    status: { $in: ['active', 'trialing'] },
    endDate: { $gt: new Date() }
  }).populate('tenantId', 'name email subdomain');
};

// Static method to get subscriptions due for renewal
SubscriptionSchema.statics.getSubscriptionsDueForRenewal = function(days = 7) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  
  return this.find({
    status: { $in: ['active', 'trialing'] },
    nextBillingDate: { $lte: dueDate }
  }).populate('tenantId', 'name email subdomain');
};

// Static method to get subscription statistics
SubscriptionSchema.statics.getSubscriptionStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$amount' }
      }
    }
  ]);
};

// Static method to get plan distribution
SubscriptionSchema.statics.getPlanDistribution = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$amount' }
      }
    }
  ]);
};

// Instance method to check if subscription is active
SubscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && this.endDate > new Date();
};

// Instance method to check if subscription is in trial
SubscriptionSchema.methods.isInTrial = function() {
  return this.trialEndDate && this.trialEndDate > new Date();
};

// Instance method to check if subscription is expired
SubscriptionSchema.methods.isExpired = function() {
  return this.endDate < new Date();
};

// Instance method to check if subscription is due for renewal
SubscriptionSchema.methods.isDueForRenewal = function(days = 7) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return this.nextBillingDate <= dueDate;
};

// Instance method to renew subscription
SubscriptionSchema.methods.renew = function() {
  const currentEndDate = new Date(this.endDate);
  const newEndDate = new Date(currentEndDate.getTime() + getBillingCycleDays(this.billingCycle) * 24 * 60 * 60 * 1000);
  
  this.endDate = newEndDate;
  this.nextBillingDate = newEndDate;
  this.lastPaymentDate = new Date();
  this.paymentStatus = 'paid';
  
  return this.save();
};

// Instance method to cancel subscription
SubscriptionSchema.methods.cancel = function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  this.cancelledBy = cancelledBy;
  this.autoRenew = false;
  
  return this.save();
};

// Instance method to suspend subscription
SubscriptionSchema.methods.suspend = function() {
  this.status = 'suspended';
  return this.save();
};

// Instance method to activate subscription
SubscriptionSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

// Instance method to update usage
SubscriptionSchema.methods.updateUsage = function(usageType, count) {
  if (this.features[usageType]) {
    this.features[usageType].used = count;
  }
  return this.save();
};

// Instance method to check if usage limit is exceeded
SubscriptionSchema.methods.isUsageExceeded = function(usageType) {
  const feature = this.features[usageType];
  if (!feature || feature.limit === -1) return false; // -1 means unlimited
  return feature.used >= feature.limit;
};

// Helper function to get billing cycle days
function getBillingCycleDays(billingCycle) {
  const cycleDays = {
    monthly: 30,
    quarterly: 90,
    yearly: 365
  };
  return cycleDays[billingCycle] || 30;
}

// Helper function to get plan features
function getPlanFeatures(plan) {
  const planFeatures = {
    basic: {
      users: { limit: 5, used: 0 },
      appointments: { limit: 100, used: 0 },
      customers: { limit: 200, used: 0 },
      storage: { limit: 1024, used: 0 },
      support: 'email'
    },
    premium: {
      users: { limit: 25, used: 0 },
      appointments: { limit: 500, used: 0 },
      customers: { limit: 1000, used: 0 },
      storage: { limit: 5120, used: 0 },
      support: 'priority'
    },
    enterprise: {
      users: { limit: -1, used: 0 }, // unlimited
      appointments: { limit: -1, used: 0 }, // unlimited
      customers: { limit: -1, used: 0 }, // unlimited
      storage: { limit: 10240, used: 0 },
      support: '24_7'
    },
    custom: {
      users: { limit: 10, used: 0 },
      appointments: { limit: 200, used: 0 },
      customers: { limit: 500, used: 0 },
      storage: { limit: 2048, used: 0 },
      support: 'email'
    }
  };
  return planFeatures[plan] || planFeatures.basic;
}

// Pre-save middleware to set end date if not provided
SubscriptionSchema.pre('save', function(next) {
  if (!this.endDate) {
    this.endDate = new Date(this.startDate.getTime() + getBillingCycleDays(this.billingCycle) * 24 * 60 * 60 * 1000);
  }
  if (!this.nextBillingDate) {
    this.nextBillingDate = this.trialEndDate || this.endDate;
  }
  next();
});

module.exports = mongoose.model('Subscription', SubscriptionSchema); 