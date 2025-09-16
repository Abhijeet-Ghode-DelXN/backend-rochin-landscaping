const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Equipment name is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Equipment type is required'],
    enum: ['Mower', 'Tree Care', 'Cleanup', 'Truck', 'Other']
  },
  serialNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['available', 'in-use', 'maintenance'],
    default: 'available'
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  minQuantity: {
    type: Number,
    required: [true, 'Minimum quantity is required'],
    min: [1, 'Minimum quantity must be at least 1']
  },
  assignedTo: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: 'Warehouse A'
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  lastMaintenance: {
    type: Date,
    default: Date.now
  },
  nextMaintenance: {
    type: Date
  },
  maintenanceInterval: {
    type: Number,
    default: 30,
    min: [1, 'Maintenance interval must be at least 1 day']
  },
  imageUrl: {
    type: String,
    trim: true
  },
  tenantId: {
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

// Calculate next maintenance date before saving
equipmentSchema.pre('save', function(next) {
  if (this.isModified('lastMaintenance') || this.isModified('maintenanceInterval')) {
    const nextDate = new Date(this.lastMaintenance);
    nextDate.setDate(nextDate.getDate() + this.maintenanceInterval);
    this.nextMaintenance = nextDate;
  }
  next();
});

// Index for tenant-based queries
equipmentSchema.index({ tenantId: 1 });
equipmentSchema.index({ status: 1 });
equipmentSchema.index({ type: 1 });

module.exports = mongoose.model('Equipment', equipmentSchema);