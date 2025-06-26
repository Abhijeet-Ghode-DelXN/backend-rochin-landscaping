// const mongoose = require('mongoose');
// const tenantScopePlugin = require('./plugins/tenantScope.plugin');

// const portfolioSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: [true, 'Title is required'],
//     trim: true,
//     maxlength: [100, 'Title cannot be more than 100 characters']
//   },
//   description: {
//     type: String,
//     required: [true, 'Description is required'],
//     trim: true,
//     maxlength: [1000, 'Description cannot be more than 1000 characters']
//   },
//   location: {
//     type: String,
//     required: [true, 'Location is required'],
//     trim: true
//   },
//   serviceType: {
//     type: String,
//     required: [true, 'Service type is required'],
//     enum: ['landscaping', 'garden-design', 'lawn-care', 'irrigation', 'hardscaping', 'maintenance', 'other'],
//     default: 'other'
//   },
//   projectDate: {
//     type: Date,
//     required: [true, 'Project date is required']
//   },
//   images: [{
//     url: {
//       type: String,
//       required: true
//     },
//     publicId: {
//       type: String,
//       required: true
//     },
//     caption: String,
//     isFeatured: {
//       type: Boolean,
//       default: false
//     },
//     type: {
//       type: String,
//       enum: ['before', 'after', 'during'],
//       default: 'after'
//     }
//   }],
//   status: {
//     type: String,
//     enum: ['draft', 'published', 'archived'],
//     default: 'draft'
//   },
//   tags: [{
//     type: String,
//     trim: true
//   }],
//   clientName: {
//     type: String,
//     trim: true
//   },
//   projectDuration: {
//     type: String,
//     trim: true
//   },
//   projectCost: {
//     type: Number,
//     min: [0, 'Project cost cannot be negative']
//   },
//   projectSize: {
//     type: String,
//     trim: true
//   },
//   challenges: {
//     type: String,
//     trim: true,
//     maxlength: [500, 'Challenges cannot be more than 500 characters']
//   },
//   solutions: {
//     type: String,
//     trim: true,
//     maxlength: [500, 'Solutions cannot be more than 500 characters']
//   },
//   customerFeedback: {
//     type: String,
//     trim: true,
//     maxlength: [500, 'Customer feedback cannot be more than 500 characters']
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// // Add index for better search performance
// portfolioSchema.index({ title: 'text', description: 'text', location: 'text', serviceType: 'text' });

// portfolioSchema.plugin(tenantScopePlugin);

// module.exports = mongoose.model('Portfolio', portfolioSchema); 



const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope.plugin');

const portfolioSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    enum: ['landscaping', 'garden-design', 'lawn-care', 'irrigation', 'hardscaping', 'maintenance', 'other'],
    default: 'landscaping'
  },
  projectDate: {
    type: Date,
    required: [true, 'Project date is required']
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
    caption: String,
    type: {
      type: String,
      enum: ['before', 'after', 'progress'],
      default: 'after'
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  tags: [{
    type: String,
    trim: true
  }],
  clientName: {
    type: String,
    trim: true
  },
  projectDuration: {
    type: String,
    trim: true
  },
  projectCost: {
    type: Number,
    default: 0
  },
  projectSize: {
    type: String,
    trim: true
  },
  challenges: {
    type: String,
    trim: true
  },
  solutions: {
    type: String,
    trim: true
  },
  customerFeedback: {
    type: String,
    trim: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Add indexes
portfolioSchema.index({ title: 'text', description: 'text', location: 'text' });
portfolioSchema.index({ tenant: 1 });
portfolioSchema.index({ createdBy: 1 });

// Apply tenant scope plugin
portfolioSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Portfolio', portfolioSchema);