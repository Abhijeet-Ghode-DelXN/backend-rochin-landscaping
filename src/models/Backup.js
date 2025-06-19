const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['full', 'database', 'files', 'config', 'custom'],
    default: 'full'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'restored'],
    default: 'pending'
  },
  size: {
    type: Number,
    default: 0
  },
  filePath: {
    type: String,
    default: null
  },
  fileUrl: {
    type: String,
    default: null
  },
  checksum: {
    type: String,
    default: null
  },
  compression: {
    type: String,
    enum: ['none', 'gzip', 'zip', 'tar.gz'],
    default: 'gzip'
  },
  encryption: {
    enabled: {
      type: Boolean,
      default: false
    },
    algorithm: {
      type: String,
      enum: ['aes-256-gcm', 'aes-256-cbc'],
      default: 'aes-256-gcm'
    },
    keyId: {
      type: String,
      default: null
    }
  },
  retention: {
    type: String,
    enum: ['7_days', '30_days', '90_days', '1_year', 'forever'],
    default: '30_days'
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  processingTime: {
    type: Number,
    default: 0
  },
  errorMessage: {
    type: String,
    default: null
  },
  metadata: {
    collections: [{
      name: String,
      count: Number,
      size: Number
    }],
    database: {
      name: String,
      version: String,
      size: Number
    },
    files: {
      count: Number,
      totalSize: Number
    },
    config: {
      version: String,
      environment: String
    }
  },
  isAutomated: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  nextScheduledRun: {
    type: Date,
    default: null
  },
  restoreHistory: [{
    restoredAt: {
      type: Date,
      default: Date.now
    },
    restoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true
    },
    errorMessage: String,
    targetEnvironment: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient querying
BackupSchema.index({ type: 1, createdAt: -1 });
BackupSchema.index({ status: 1 });
BackupSchema.index({ scheduledFor: 1 });
BackupSchema.index({ nextScheduledRun: 1 });
BackupSchema.index({ createdBy: 1 });
BackupSchema.index({ 'metadata.database.name': 1 });

// Static method to create backup
BackupSchema.statics.createBackup = function(data) {
  return this.create({
    name: data.name,
    type: data.type,
    compression: data.compression || 'gzip',
    encryption: data.encryption || { enabled: false },
    retention: data.retention || '30_days',
    scheduledFor: data.scheduledFor,
    isAutomated: data.isAutomated || false,
    isRecurring: data.isRecurring || false,
    frequency: data.frequency,
    createdBy: data.createdBy,
    notes: data.notes
  });
};

// Static method to get scheduled backups
BackupSchema.statics.getScheduledBackups = function() {
  return this.find({
    scheduledFor: { $lte: new Date() },
    status: 'pending'
  });
};

// Static method to get recurring backups
BackupSchema.statics.getRecurringBackups = function() {
  return this.find({
    isRecurring: true,
    nextScheduledRun: { $lte: new Date() }
  });
};

// Static method to get backup statistics
BackupSchema.statics.getBackupStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Static method to get backups by status
BackupSchema.statics.getBackupsByStatus = function(status, options = {}) {
  const { page = 1, limit = 20, type } = options;
  
  let query = { status };
  
  if (type) query.type = type;
  
  return this.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to get latest successful backup
BackupSchema.statics.getLatestSuccessfulBackup = function(type = 'full') {
  return this.findOne({
    type,
    status: 'completed'
  }).sort({ completedAt: -1 });
};

// Instance method to start backup process
BackupSchema.methods.startBackup = function() {
  this.status = 'processing';
  this.startedAt = new Date();
  return this.save();
};

// Instance method to complete backup
BackupSchema.methods.completeBackup = function(filePath, fileUrl, size, checksum, metadata) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.filePath = filePath;
  this.fileUrl = fileUrl;
  this.size = size;
  this.checksum = checksum;
  this.metadata = metadata;
  this.processingTime = this.completedAt - this.startedAt;
  
  if (this.isRecurring) {
    this.scheduleNextRun();
  }
  
  return this.save();
};

// Instance method to fail backup
BackupSchema.methods.failBackup = function(errorMessage) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.errorMessage = errorMessage;
  this.processingTime = this.completedAt - this.startedAt;
  return this.save();
};

// Instance method to schedule next run
BackupSchema.methods.scheduleNextRun = function() {
  if (!this.isRecurring) return;
  
  const now = new Date();
  let nextRun = new Date();
  
  switch (this.frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
    default:
      return;
  }
  
  this.nextScheduledRun = nextRun;
  return this.save();
};

// Instance method to restore backup
BackupSchema.methods.restore = function(restoredBy, targetEnvironment = 'production') {
  const restoreEntry = {
    restoredAt: new Date(),
    restoredBy,
    status: 'success',
    targetEnvironment
  };
  
  this.restoreHistory.push(restoreEntry);
  this.status = 'restored';
  return this.save();
};

// Instance method to fail restore
BackupSchema.methods.failRestore = function(restoredBy, errorMessage, targetEnvironment = 'production') {
  const restoreEntry = {
    restoredAt: new Date(),
    restoredBy,
    status: 'failed',
    errorMessage,
    targetEnvironment
  };
  
  this.restoreHistory.push(restoreEntry);
  return this.save();
};

// Instance method to check if backup is ready for processing
BackupSchema.methods.isReadyForProcessing = function() {
  return this.status === 'pending' && 
         (!this.scheduledFor || this.scheduledFor <= new Date());
};

// Instance method to check if backup is completed
BackupSchema.methods.isCompleted = function() {
  return this.status === 'completed';
};

// Instance method to check if backup failed
BackupSchema.methods.isFailed = function() {
  return this.status === 'failed';
};

// Instance method to check if backup is expired
BackupSchema.methods.isExpired = function() {
  if (this.retention === 'forever') return false;
  
  const retentionDays = {
    '7_days': 7,
    '30_days': 30,
    '90_days': 90,
    '1_year': 365
  };
  
  const days = retentionDays[this.retention] || 30;
  const expiryDate = new Date(this.createdAt);
  expiryDate.setDate(expiryDate.getDate() + days);
  
  return new Date() > expiryDate;
};

// Instance method to get formatted size
BackupSchema.methods.getFormattedSize = function() {
  if (this.size === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = this.size;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// Instance method to get processing time in human readable format
BackupSchema.methods.getFormattedProcessingTime = function() {
  if (this.processingTime === 0) return '0s';
  
  const seconds = Math.floor(this.processingTime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

// Pre-save middleware to set next scheduled run for recurring backups
BackupSchema.pre('save', function(next) {
  if (this.isRecurring && !this.nextScheduledRun && this.frequency) {
    this.scheduleNextRun();
  }
  next();
});

module.exports = mongoose.model('Backup', BackupSchema); 