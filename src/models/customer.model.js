const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    street: {
      type: String,
    //   required: [true, 'Please add street address']
    },
    city: {
      type: String,
    //   required: [true, 'Please add city']
    },
    state: {
      type: String,
    //   required: [true, 'Please add state']
    },
    zipCode: {
      type: String,
    //   required: [true, 'Please add zip code']
    },
    country: {
      type: String,
      default: 'USA'
    }
  },
  propertyDetails: {
    size: {
      type: Number, // in square feet
    //   required: [true, 'Please add property size']
    },
//     propertyPhotos: [{
//   type: String, // This would typically be a URL or file path
//   required: false
// }],

images: [{
    url: String,
    publicId: String
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
      }
    },
    accessInstructions: {
      type: String
    }
  },
  servicePreferences: {
    preferredDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    preferredTimeOfDay: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'Any'],
      default: 'Any'
    }
  },
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    reminderDaysBefore: {
      type: Number,
      default: 1
    }
  },
  customerSince: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
}, {
  timestamps: true,
   toJSON: { virtual: true },  // Include virtuals in JSON responses
  toObject: { virtual: true } // Include virtuals when calling .toObject()
});

// Virtual for all appointments
CustomerSchema.virtual('appointments', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'customer',
  justOne: false

  
});

// Virtual for all estimates
CustomerSchema.virtual('estimates', {
  ref: 'Estimate',
  localField: '_id',
  foreignField: 'customer',
  justOne: false
});



delete mongoose.models.Customer;
module.exports = mongoose.model('Customer', CustomerSchema); 