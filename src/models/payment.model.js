const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope.plugin');

const PaymentSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  estimate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estimate'
  },
  paymentType: {
    type: String,
    enum: ['Deposit', 'Full Payment', 'Installment', 'Recurring', 'Additional Service', 'Refund'],
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Please add payment amount']
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Completed', 'Failed', 'Refunded', 'Partially Refunded'],
    default: 'Pending'
  },
  method: {
    type: String,
    enum: ['Credit Card', 'PayPal', 'Bank Transfer', 'Cash', 'Check'],
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  gateway: {
    type: String,
    enum: ['Stripe', 'PayPal', 'Manual'],
    required: true
  },
  gatewayTransactionId: {
    type: String
  },
  receiptNumber: {
    type: String,
    unique: true
  },
  receiptUrl: {
    type: String
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'USA'
    }
  },
  cardDetails: {
    lastFour: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  recurringPayment: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annually']
    },
    nextPaymentDate: Date,
    subscriptionId: String
  },
  refund: {
    amount: Number,
    reason: String,
    refundedAt: Date,
    refundTransactionId: String
  },
  notes: {
    type: String
  },
  metadata: {
    type: Map,
    of: String
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create receipt number before saving
PaymentSchema.pre('save', async function(next) {
  if (!this.receiptNumber) {
    const count = await this.constructor.countDocuments();
    const date = new Date();
    this.receiptNumber = `RCPT-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

PaymentSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Payment', PaymentSchema); 