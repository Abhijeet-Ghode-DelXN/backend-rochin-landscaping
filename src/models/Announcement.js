const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope.plugin');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'inactive'
  },
  displayDuration: {
    type: Number,
    default: 5, // Duration in seconds
    min: 5,
    max: 10
  }
}, {
  timestamps: true
});

announcementSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model('Announcement', announcementSchema); 