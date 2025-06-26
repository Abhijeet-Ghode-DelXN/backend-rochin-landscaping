const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope.plugin');

const heroImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

heroImageSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('HeroImage', heroImageSchema); 