const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tenant name is required.'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Tenant email is required.'],
    unique: true,
    trim: true,
  },
  subdomain: {
    type: String,
    required: [true, 'Subdomain is required.'],
    trim: true,
    unique: true,
  },
   email: {
    type: String,
    required: [true, 'Email is required.'],
    trim: true,
    lowercase: true,
    unique: true,
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email'],
  },

  address: {
  type: String,
  // required: [true, 'Address is required'],
  trim: true,
 
},
phone: {
  type: String,
  // required: [true, 'Phone number is required'],
  trim: true,
  // match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
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
      enum: ['active', 'inactive', 'trialing', 'suspended'],
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
