const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'info',
      'success',
      'warning',
      'error',
      'system',
      'maintenance',
      'billing',
      'security'
    ]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  targetAudience: {
    type: String,
    enum: ['all', 'super_admin', 'tenant_admin', 'tenant_user', 'specific_tenants', 'specific_users'],
    default: 'all'
  },
  targetTenants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant'
  }],
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  channels: {
    email: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: false
    },
    in_app: {
      type: Boolean,
      default: true
    }
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  actionUrl: {
    type: String,
    required: false
  },
  actionText: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ priority: 1, createdAt: -1 });
NotificationSchema.index({ targetAudience: 1, createdAt: -1 });
NotificationSchema.index({ isActive: 1, createdAt: -1 });
NotificationSchema.index({ scheduledFor: 1 });
NotificationSchema.index({ expiresAt: 1 });

// Static method to create notification
NotificationSchema.statics.createNotification = function(data) {
  return this.create({
    title: data.title,
    message: data.message,
    type: data.type || 'info',
    priority: data.priority || 'medium',
    targetAudience: data.targetAudience || 'all',
    targetTenants: data.targetTenants || [],
    targetUsers: data.targetUsers || [],
    channels: data.channels || { in_app: true },
    scheduledFor: data.scheduledFor,
    expiresAt: data.expiresAt,
    metadata: data.metadata || {},
    createdBy: data.createdBy,
    actionUrl: data.actionUrl,
    actionText: data.actionText
  });
};

// Static method to get notifications for a user
NotificationSchema.statics.getUserNotifications = function(userId, tenantId, options = {}) {
  const { page = 1, limit = 20, unreadOnly = false } = options;
  
  let query = {
    isActive: true,
    $or: [
      { targetAudience: 'all' },
      { targetAudience: 'specific_users', targetUsers: userId },
      { targetAudience: 'specific_tenants', targetTenants: tenantId }
    ]
  };

  // Add role-based targeting
  if (tenantId) {
    query.$or.push({ targetAudience: 'tenant_admin' });
    query.$or.push({ targetAudience: 'tenant_user' });
  } else {
    query.$or.push({ targetAudience: 'super_admin' });
  }

  // Filter by read status
  if (unreadOnly) {
    query['readBy.user'] = { $ne: userId };
  }

  // Filter by expiration
  query.$and = [
    {
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    }
  ];

  return this.find(query)
    .populate('createdBy', 'name email')
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to mark notification as read
NotificationSchema.statics.markAsRead = function(notificationId, userId) {
  return this.findByIdAndUpdate(
    notificationId,
    {
      $addToSet: {
        readBy: {
          user: userId,
          readAt: new Date()
        }
      }
    },
    { new: true }
  );
};

// Static method to get unread count for a user
NotificationSchema.statics.getUnreadCount = function(userId, tenantId) {
  const query = {
    isActive: true,
    'readBy.user': { $ne: userId },
    $or: [
      { targetAudience: 'all' },
      { targetAudience: 'specific_users', targetUsers: userId },
      { targetAudience: 'specific_tenants', targetTenants: tenantId }
    ],
    $and: [
      {
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }
    ]
  };

  // Add role-based targeting
  if (tenantId) {
    query.$or.push({ targetAudience: 'tenant_admin' });
    query.$or.push({ targetAudience: 'tenant_user' });
  } else {
    query.$or.push({ targetAudience: 'super_admin' });
  }

  return this.countDocuments(query);
};

// Static method to get system notifications
NotificationSchema.statics.getSystemNotifications = function(options = {}) {
  const { page = 1, limit = 20, type, priority } = options;
  
  let query = {
    type: 'system',
    isActive: true
  };

  if (type) query.type = type;
  if (priority) query.priority = priority;

  return this.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to broadcast notification
NotificationSchema.statics.broadcast = function(data) {
  return this.create({
    title: data.title,
    message: data.message,
    type: data.type || 'info',
    priority: data.priority || 'medium',
    targetAudience: 'all',
    channels: data.channels || { in_app: true },
    metadata: data.metadata || {},
    createdBy: data.createdBy
  });
};

// Static method to create maintenance notification
NotificationSchema.statics.createMaintenanceNotification = function(data) {
  return this.create({
    title: data.title || 'System Maintenance',
    message: data.message,
    type: 'maintenance',
    priority: data.priority || 'high',
    targetAudience: 'all',
    channels: { in_app: true, email: true },
    scheduledFor: data.scheduledFor,
    expiresAt: data.expiresAt,
    metadata: data.metadata || {},
    createdBy: data.createdBy
  });
};

// Static method to create security alert
NotificationSchema.statics.createSecurityAlert = function(data) {
  return this.create({
    title: data.title || 'Security Alert',
    message: data.message,
    type: 'security',
    priority: 'critical',
    targetAudience: data.targetAudience || 'super_admin',
    channels: { in_app: true, email: true },
    metadata: data.metadata || {},
    createdBy: data.createdBy
  });
};

// Instance method to check if notification is expired
NotificationSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

// Instance method to check if notification is scheduled
NotificationSchema.methods.isScheduled = function() {
  return this.scheduledFor && this.scheduledFor > new Date();
};

// Instance method to check if user has read this notification
NotificationSchema.methods.isReadByUser = function(userId) {
  return this.readBy.some(read => read.user.toString() === userId.toString());
};

// Pre-save middleware to set default expiration
NotificationSchema.pre('save', function(next) {
  // Set default expiration to 30 days if not specified
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Notification', NotificationSchema); 