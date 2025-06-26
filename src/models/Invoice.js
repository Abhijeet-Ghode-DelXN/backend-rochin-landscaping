const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['subscription', 'one_time', 'overage', 'credit', 'discount'],
    default: 'subscription'
  }
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: false
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft'
  },
  type: {
    type: String,
    required: true,
    enum: ['subscription', 'one_time', 'credit', 'refund'],
    default: 'subscription'
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date,
    default: null
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  taxAmount: {
    type: Number,
    required: true,
    default: 0
  },
  discountAmount: {
    type: Number,
    required: true,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  items: [InvoiceItemSchema],
  billingAddress: {
    name: String,
    company: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    email: String,
    phone: String
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_transfer', 'paypal', 'check'],
      default: 'card'
    },
    last4: String,
    brand: String,
    transactionId: String
  },
  notes: {
    type: String,
    default: null
  },
  terms: {
    type: String,
    default: 'Net 30'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ tenantId: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ issueDate: -1 });
InvoiceSchema.index({ dueDate: 1 });
InvoiceSchema.index({ subscriptionId: 1 });

// Static method to generate invoice number
InvoiceSchema.statics.generateInvoiceNumber = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  
  return `INV-${year}${month}${day}-${timestamp}`;
};

// Static method to create subscription invoice
InvoiceSchema.statics.createSubscriptionInvoice = function(data) {
  const { tenantId, subscriptionId, subscription, billingCycle } = data;
  
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 30); // Net 30 terms
  
  const items = [{
    description: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan - ${billingCycle}`,
    quantity: 1,
    unitPrice: subscription.amount,
    amount: subscription.amount,
    type: 'subscription'
  }];
  
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalAmount = subtotal; // No tax or discount for now
  
  return this.create({
    invoiceNumber: this.generateInvoiceNumber(),
    tenantId,
    subscriptionId,
    type: 'subscription',
    issueDate,
    dueDate,
    subtotal,
    totalAmount,
    currency: subscription.currency,
    items,
    billingAddress: data.billingAddress
  });
};

// Static method to get overdue invoices
InvoiceSchema.statics.getOverdueInvoices = function() {
  return this.find({
    status: { $in: ['sent', 'overdue'] },
    dueDate: { $lt: new Date() }
  }).populate('tenantId', 'name email subdomain');
};

// Static method to get invoice statistics
InvoiceSchema.statics.getInvoiceStats = function(tenantId = null, period = 'month') {
  const startDate = new Date();
  
  switch (period) {
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }
  
  const matchStage = {
    issueDate: { $gte: startDate }
  };
  
  if (tenantId) {
    matchStage.tenantId = tenantId;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
};

// Static method to get revenue by period
InvoiceSchema.statics.getRevenueByPeriod = function(period = 'month', months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.aggregate([
    {
      $match: {
        status: 'paid',
        issueDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$issueDate' },
          month: { $month: '$issueDate' }
        },
        revenue: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
};

// Instance method to mark as paid
InvoiceSchema.methods.markAsPaid = function(paymentMethod = {}) {
  this.status = 'paid';
  this.paidDate = new Date();
  this.paymentMethod = paymentMethod;
  return this.save();
};

// Instance method to mark as overdue
InvoiceSchema.methods.markAsOverdue = function() {
  if (this.status === 'sent' && this.dueDate < new Date()) {
    this.status = 'overdue';
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to cancel invoice
InvoiceSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

// Instance method to add item
InvoiceSchema.methods.addItem = function(item) {
  this.items.push(item);
  this.calculateTotals();
  return this.save();
};

// Instance method to remove item
InvoiceSchema.methods.removeItem = function(itemIndex) {
  if (itemIndex >= 0 && itemIndex < this.items.length) {
    this.items.splice(itemIndex, 1);
    this.calculateTotals();
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to calculate totals
InvoiceSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;
  return this;
};

// Instance method to check if invoice is overdue
InvoiceSchema.methods.isOverdue = function() {
  return this.status === 'sent' && this.dueDate < new Date();
};

// Instance method to check if invoice is paid
InvoiceSchema.methods.isPaid = function() {
  return this.status === 'paid';
};

// Instance method to get days overdue
InvoiceSchema.methods.getDaysOverdue = function() {
  if (!this.isOverdue()) return 0;
  const today = new Date();
  const diffTime = Math.abs(today - this.dueDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Pre-save middleware to calculate totals
InvoiceSchema.pre('save', function(next) {
  if (this.isModified('items') || this.isModified('taxAmount') || this.isModified('discountAmount')) {
    this.calculateTotals();
  }
  next();
});

// Pre-save middleware to set due date if not provided
InvoiceSchema.pre('save', function(next) {
  if (!this.dueDate) {
    this.dueDate = new Date(this.issueDate);
    this.dueDate.setDate(this.dueDate.getDate() + 30); // Net 30 terms
  }
  next();
});

module.exports = mongoose.model('Invoice', InvoiceSchema); 