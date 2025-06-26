const mongoose = require('mongoose');

const SystemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'general',
      'email',
      'payment',
      'security',
      'features',
      'limits',
      'notifications',
      'maintenance'
    ]
  },
  description: {
    type: String,
    required: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    default: 'string'
  },
  validation: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient querying
SystemSettingSchema.index({ key: 1 });
SystemSettingSchema.index({ category: 1 });

// Static method to get setting by key
SystemSettingSchema.statics.getSetting = function(key) {
  return this.findOne({ key });
};

// Static method to set setting
SystemSettingSchema.statics.setSetting = function(key, value, options = {}) {
  return this.findOneAndUpdate(
    { key },
    { 
      value,
      ...options
    },
    { 
      new: true,
      upsert: true,
      runValidators: true
    }
  );
};

// Static method to get settings by category
SystemSettingSchema.statics.getSettingsByCategory = function(category) {
  return this.find({ category });
};

// Static method to get all public settings
SystemSettingSchema.statics.getPublicSettings = function() {
  return this.find({ isPublic: true });
};

// Static method to initialize default settings
SystemSettingSchema.statics.initializeDefaults = function() {
  const defaultSettings = [
    {
      key: 'site_name',
      value: 'Landscaping Management System',
      category: 'general',
      description: 'The name of the application',
      isPublic: true,
      dataType: 'string'
    },
    {
      key: 'site_description',
      value: 'Multi-tenant landscaping business management platform',
      category: 'general',
      description: 'The description of the application',
      isPublic: true,
      dataType: 'string'
    },
    {
      key: 'maintenance_mode',
      value: false,
      category: 'maintenance',
      description: 'Whether the system is in maintenance mode',
      isPublic: true,
      dataType: 'boolean'
    },
    {
      key: 'registration_enabled',
      value: true,
      category: 'features',
      description: 'Whether new tenant registration is enabled',
      isPublic: true,
      dataType: 'boolean'
    },
    {
      key: 'max_tenants',
      value: 1000,
      category: 'limits',
      description: 'Maximum number of tenants allowed',
      isPublic: false,
      dataType: 'number'
    },
    {
      key: 'max_users_per_tenant',
      value: 50,
      category: 'limits',
      description: 'Maximum number of users per tenant',
      isPublic: false,
      dataType: 'number'
    },
    {
      key: 'password_min_length',
      value: 8,
      category: 'security',
      description: 'Minimum password length',
      isPublic: true,
      dataType: 'number'
    },
    {
      key: 'require_email_verification',
      value: true,
      category: 'security',
      description: 'Whether email verification is required',
      isPublic: true,
      dataType: 'boolean'
    },
    {
      key: 'session_timeout',
      value: 24,
      category: 'security',
      description: 'Session timeout in hours',
      isPublic: false,
      dataType: 'number'
    },
    {
      key: 'max_login_attempts',
      value: 5,
      category: 'security',
      description: 'Maximum login attempts before lockout',
      isPublic: false,
      dataType: 'number'
    },
    {
      key: 'email_provider',
      value: 'smtp',
      category: 'email',
      description: 'Email service provider',
      isPublic: false,
      dataType: 'string'
    },
    {
      key: 'smtp_host',
      value: process.env.SMTP_HOST || '',
      category: 'email',
      description: 'SMTP host for email service',
      isPublic: false,
      dataType: 'string'
    },
    {
      key: 'smtp_port',
      value: parseInt(process.env.SMTP_PORT) || 587,
      category: 'email',
      description: 'SMTP port for email service',
      isPublic: false,
      dataType: 'number'
    },
    {
      key: 'from_email',
      value: process.env.FROM_EMAIL || 'noreply@landscaping.com',
      category: 'email',
      description: 'Default from email address',
      isPublic: false,
      dataType: 'string'
    },
    {
      key: 'from_name',
      value: process.env.FROM_NAME || 'Landscaping System',
      category: 'email',
      description: 'Default from name',
      isPublic: false,
      dataType: 'string'
    },
    {
      key: 'payment_provider',
      value: 'stripe',
      category: 'payment',
      description: 'Payment service provider',
      isPublic: false,
      dataType: 'string'
    },
    {
      key: 'currency',
      value: 'USD',
      category: 'payment',
      description: 'Default currency for payments',
      isPublic: true,
      dataType: 'string'
    },
    {
      key: 'subscription_plans',
      value: {
        basic: {
          price: 29,
          features: ['Basic features', '5 users', 'Email support'],
          limits: {
            users: 5,
            appointments: 100,
            customers: 200
          }
        },
        premium: {
          price: 79,
          features: ['All basic features', '25 users', 'Priority support'],
          limits: {
            users: 25,
            appointments: 500,
            customers: 1000
          }
        },
        enterprise: {
          price: 199,
          features: ['All premium features', 'Unlimited users', '24/7 support'],
          limits: {
            users: -1, // unlimited
            appointments: -1, // unlimited
            customers: -1 // unlimited
          }
        }
      },
      category: 'payment',
      description: 'Available subscription plans',
      isPublic: true,
      dataType: 'object'
    },
    {
      key: 'notification_settings',
      value: {
        email_notifications: true,
        sms_notifications: false,
        push_notifications: false,
        admin_alerts: true
      },
      category: 'notifications',
      description: 'Global notification settings',
      isPublic: false,
      dataType: 'object'
    }
  ];

  return Promise.all(
    defaultSettings.map(setting => 
      this.findOneAndUpdate(
        { key: setting.key },
        setting,
        { upsert: true, new: true }
      )
    )
  );
};

// Pre-save middleware to validate data type
SystemSettingSchema.pre('save', function(next) {
  if (this.isModified('value')) {
    const valueType = Array.isArray(this.value) ? 'array' : typeof this.value;
    
    if (valueType !== this.dataType && this.dataType !== 'object') {
      return next(new Error(`Value type ${valueType} does not match expected type ${this.dataType}`));
    }
  }
  next();
});

module.exports = mongoose.model('SystemSetting', SystemSettingSchema); 