// const mongoose = require('mongoose');
// const tenantScopePlugin = require('./plugins/tenantScope.plugin');

// const gallerySchema = new mongoose.Schema({
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
//   category: {
//     type: String,
//     required: [true, 'Category is required'],
//     enum: ['residential', 'commercial', 'event', 'landscaping', 'garden', 'other'],
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
//     }
//   }],
//   status: {
//     type: String,
//     enum: ['draft', 'published', 'archived'],
//     default: 'draft'
//   },
//   thumbnailIndex: {
//     type: Number,
//     default: 0
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
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// },


//  {
//   timestamps: true
// });



// // Add index for better search performance
// gallerySchema.index({ title: 'text', description: 'text', location: 'text' });

// gallerySchema.plugin(tenantScopePlugin);

// gallerySchema.plugin(tenantScopePlugin);

// module.exports = mongoose.model('Gallery', gallerySchema); 



const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope.plugin');

const gallerySchema = new mongoose.Schema({
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
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['residential', 'commercial', 'event', 'landscaping', 'garden', 'other'],
    default: 'other'
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
    isFeatured: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  thumbnailIndex: {
    type: Number,
    default: 0
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
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
  ref: 'Tenant',
  required: [true, 'Tenant is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Add index for better search performance
gallerySchema.index({ title: 'text', description: 'text', location: 'text' });
gallerySchema.index({ tenant: 1 });

// Apply tenant scope plugin
gallerySchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Gallery', gallerySchema);