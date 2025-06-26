const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'tenant_created',
      'tenant_updated',
      'tenant_deleted',
      'tenant_suspended',
      'tenant_activated',
      'user_registered',
      'user_updated',
      'user_deleted',
      'user_suspended',
      'user_activated',
      'login',
      'logout',
      'password_reset',
      'payment_received',
      'payment_failed',
      'subscription_created',
      'subscription_updated',
      'subscription_cancelled',
      'appointment_created',
      'appointment_updated',
      'appointment_cancelled',
      'service_created',
      'service_updated',
      'service_deleted',
      'customer_created',
      'customer_updated',
      'customer_deleted',
      'system_error',
      'system_warning',
      'backup_created',
      'settings_updated'
    ]
  },
  message: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
ActivityLogSchema.index({ type: 1, timestamp: -1 });
ActivityLogSchema.index({ tenantId: 1, timestamp: -1 });
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ severity: 1, timestamp: -1 });

// Static method to create activity log
ActivityLogSchema.statics.log = function(data) {
  return this.create({
    type: data.type,
    message: data.message,
    userId: data.userId,
    tenantId: data.tenantId,
    metadata: data.metadata || {},
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    severity: data.severity || 'low'
  });
};

// Static method to get recent activity
ActivityLogSchema.statics.getRecentActivity = function(limit = 50, filters = {}) {
  const query = {};
  
  if (filters.type) query.type = filters.type;
  if (filters.tenantId) query.tenantId = filters.tenantId;
  if (filters.userId) query.userId = filters.userId;
  if (filters.severity) query.severity = filters.severity;
  
  return this.find(query)
    .populate('userId', 'name email')
    .populate('tenantId', 'name subdomain')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get activity statistics
ActivityLogSchema.statics.getActivityStats = function(tenantId = null, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const matchStage = {
    timestamp: { $gte: startDate }
  };
  
  if (tenantId) {
    matchStage.tenantId = tenantId;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          type: '$type',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        dailyCounts: {
          $push: {
            date: '$_id.date',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);
};

module.exports = mongoose.model('ActivityLog', ActivityLogSchema); 