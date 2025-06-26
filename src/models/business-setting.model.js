const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope.plugin');

const BusinessSettingSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: [true, 'Please add a business name'],
    trim: true
  },
  businessEmail: {
    type: String,
    required: [true, 'Please add a business email'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  logo: {
    type: String
  },
  businessPhone: {
    type: String,
    required: [true, 'Please add a business phone number']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Please add a street address']
    },
    city: {
      type: String,
      required: [true, 'Please add a city']
    },
    state: {
      type: String,
      required: [true, 'Please add a state']
    },
    zipCode: {
      type: String,
      required: [true, 'Please add a zip code']
    },
    country: {
      type: String,
      default: 'USA'
    }
  },
  taxRate: {
    type: Number,
    default: 7.5 // Percentage
  },
  businessHours: {
    monday: {
      isOpen: {
        type: Boolean,
        default: true
      },
      openTime: {
        type: String,
        default: '08:00'
      },
      closeTime: {
        type: String,
        default: '17:00'
      }
    },
    tuesday: {
      isOpen: {
        type: Boolean,
        default: true
      },
      openTime: {
        type: String,
        default: '08:00'
      },
      closeTime: {
        type: String,
        default: '17:00'
      }
    },
    wednesday: {
      isOpen: {
        type: Boolean,
        default: true
      },
      openTime: {
        type: String,
        default: '08:00'
      },
      closeTime: {
        type: String,
        default: '17:00'
      }
    },
    thursday: {
      isOpen: {
        type: Boolean,
        default: true
      },
      openTime: {
        type: String,
        default: '08:00'
      },
      closeTime: {
        type: String,
        default: '17:00'
      }
    },
    friday: {
      isOpen: {
        type: Boolean,
        default: true
      },
      openTime: {
        type: String,
        default: '08:00'
      },
      closeTime: {
        type: String,
        default: '17:00'
      }
    },
    saturday: {
      isOpen: {
        type: Boolean,
        default: true
      },
      openTime: {
        type: String,
        default: '09:00'
      },
      closeTime: {
        type: String,
        default: '14:00'
      }
    },
    sunday: {
      isOpen: {
        type: Boolean,
        default: false
      },
      openTime: {
        type: String,
        default: '00:00'
      },
      closeTime: {
        type: String,
        default: '00:00'
      }
    }
  },
  notificationSettings: {
    sendAppointmentReminders: {
      type: Boolean,
      default: true
    },
    reminderHoursBefore: {
      type: Number,
      default: 24
    },
    sendCustomerFeedbackRequests: {
      type: Boolean,
      default: true
    },
    sendPaymentReceipts: {
      type: Boolean,
      default: true
    }
  },
  terms: {
    cancellationPolicy: {
      type: String,
      default: 'Cancellations must be made at least 24 hours in advance to avoid charges.'
    },
    paymentTerms: {
      type: String,
      default: 'Payment is due at the time of service unless otherwise specified.'
    },
    serviceGuarantee: {
      type: String,
      default: 'We guarantee our work. If you are not satisfied, please contact us within 7 days.'
    }
  },
  socialMedia: {
    facebook: {
      type: String
    },
    instagram: {
      type: String
    },
    twitter: {
      type: String
    },
    yelp: {
      type: String
    }
  },
  updatedBy: {
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

// We only want one document for business settings
BusinessSettingSchema.statics.getSettings = async function() {
  const settings = await this.findOne();
  if (settings) {
    return settings;
  }
  
  // Create default settings if none exist
  return await this.create({
    businessName: 'Landscaping Business',
    businessEmail: 'contact@landscapingbusiness.com',
    businessPhone: '555-123-4567',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345'
    }
  });
};

BusinessSettingSchema.plugin(tenantScopePlugin);

BusinessSettingSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('BusinessSetting', BusinessSettingSchema); 