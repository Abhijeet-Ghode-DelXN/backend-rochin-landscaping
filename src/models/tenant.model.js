const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tenant name is required.'],
    trim: true,
  },
  subdomain: {
    type: String,
    required: [true, 'Subdomain is required.'],
    trim: true,
    unique: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  settings: {
    logo: String,
    themeColor: String,
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
  subscription: {
    plan: {
      type: String,
      enum: ['monthly', 'annual', 'none'],
      default: 'none',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'trialing'],
      default: 'trialing',
    },
    startDate: Date,
    endDate: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Tenant', tenantSchema);
