const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'tenant_analytics',
      'revenue_analytics',
      'user_analytics',
      'activity_analytics',
      'subscription_analytics',
      'appointment_analytics',
      'customer_analytics',
      'service_analytics',
      'system_health',
      'billing_report',
      'custom'
    ]
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  format: {
    type: String,
    required: true,
    enum: ['json', 'csv', 'pdf', 'excel'],
    default: 'json'
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  dateRange: {
    startDate: {
      type: Date,
      required: false
    },
    endDate: {
      type: Date,
      required: false
    }
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  summary: {
    totalRecords: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalUsers: {
      type: Number,
      default: 0
    },
    totalTenants: {
      type: Number,
      default: 0
    }
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: 0
  },
  processingTime: {
    type: Number,
    default: 0
  },
  errorMessage: {
    type: String,
    default: null
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  frequency: {
    type: String,
    enum: ['one_time', 'daily', 'weekly', 'monthly'],
    default: 'one_time'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  nextRun: {
    type: Date,
    default: null
  },
  recipients: [{
    email: String,
    name: String,
    type: {
      type: String,
      enum: ['email', 'webhook'],
      default: 'email'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient querying
ReportSchema.index({ type: 1, createdAt: -1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ tenantId: 1 });
ReportSchema.index({ scheduledFor: 1 });
ReportSchema.index({ nextRun: 1 });
ReportSchema.index({ createdBy: 1 });

// Static method to create report
ReportSchema.statics.createReport = function(data) {
  return this.create({
    name: data.name,
    type: data.type,
    format: data.format,
    filters: data.filters || {},
    dateRange: data.dateRange,
    tenantId: data.tenantId,
    scheduledFor: data.scheduledFor,
    frequency: data.frequency,
    isRecurring: data.isRecurring,
    recipients: data.recipients || [],
    createdBy: data.createdBy,
    metadata: data.metadata || {}
  });
};

// Static method to get reports by type
ReportSchema.statics.getReportsByType = function(type, options = {}) {
  const { page = 1, limit = 20, tenantId, status } = options;
  
  let query = { type };
  
  if (tenantId) query.tenantId = tenantId;
  if (status) query.status = status;
  
  return this.find(query)
    .populate('createdBy', 'name email')
    .populate('tenantId', 'name subdomain')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to get scheduled reports
ReportSchema.statics.getScheduledReports = function() {
  return this.find({
    isRecurring: true,
    nextRun: { $lte: new Date() }
  });
};

// Static method to get report statistics
ReportSchema.statics.getReportStats = function(tenantId = null) {
  const matchStage = {};
  
  if (tenantId) {
    matchStage.tenantId = tenantId;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
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

// Instance method to start processing
ReportSchema.methods.startProcessing = function() {
  this.status = 'processing';
  this.processingTime = Date.now();
  return this.save();
};

// Instance method to complete processing
ReportSchema.methods.completeProcessing = function(data, fileUrl = null, fileSize = 0) {
  this.status = 'completed';
  this.data = data;
  this.fileUrl = fileUrl;
  this.fileSize = fileSize;
  this.processingTime = Date.now() - this.processingTime;
  this.summary = this.calculateSummary(data);
  
  if (this.isRecurring) {
    this.scheduleNextRun();
  }
  
  return this.save();
};

// Instance method to fail processing
ReportSchema.methods.failProcessing = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.processingTime = Date.now() - this.processingTime;
  return this.save();
};

// Instance method to schedule next run
ReportSchema.methods.scheduleNextRun = function() {
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
  
  this.nextRun = nextRun;
  return this.save();
};

// Instance method to calculate summary
ReportSchema.methods.calculateSummary = function(data) {
  const summary = {
    totalRecords: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalTenants: 0
  };
  
  if (data && typeof data === 'object') {
    // Calculate summary based on report type
    switch (this.type) {
      case 'revenue_analytics':
        summary.totalRevenue = data.totalRevenue || 0;
        summary.totalRecords = data.invoices?.length || 0;
        break;
      case 'user_analytics':
        summary.totalUsers = data.totalUsers || 0;
        summary.totalRecords = data.users?.length || 0;
        break;
      case 'tenant_analytics':
        summary.totalTenants = data.totalTenants || 0;
        summary.totalRecords = data.tenants?.length || 0;
        break;
      case 'appointment_analytics':
        summary.totalRecords = data.appointments?.length || 0;
        break;
      case 'customer_analytics':
        summary.totalRecords = data.customers?.length || 0;
        break;
      default:
        summary.totalRecords = Array.isArray(data) ? data.length : 0;
    }
  }
  
  return summary;
};

// Instance method to check if report is ready for processing
ReportSchema.methods.isReadyForProcessing = function() {
  return this.status === 'pending' && 
         (!this.scheduledFor || this.scheduledFor <= new Date());
};

// Instance method to check if report is completed
ReportSchema.methods.isCompleted = function() {
  return this.status === 'completed';
};

// Instance method to check if report failed
ReportSchema.methods.isFailed = function() {
  return this.status === 'failed';
};

// Instance method to get report data as formatted string
ReportSchema.methods.getFormattedData = function() {
  if (!this.data) return null;
  
  switch (this.format) {
    case 'json':
      return JSON.stringify(this.data, null, 2);
    case 'csv':
      return this.convertToCSV(this.data);
    default:
      return this.data;
  }
};

// Instance method to convert data to CSV
ReportSchema.methods.convertToCSV = function(data) {
  if (!Array.isArray(data) || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value}"` : value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

// Pre-save middleware to set next run for recurring reports
ReportSchema.pre('save', function(next) {
  if (this.isRecurring && !this.nextRun && this.frequency !== 'one_time') {
    this.scheduleNextRun();
  }
  next();
});

module.exports = mongoose.model('Report', ReportSchema); 