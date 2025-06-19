const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Tenant = require('../models/tenant.model');
const SystemSetting = require('../models/SystemSetting');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const Report = require('../models/Report');
const Backup = require('../models/Backup');

/**
 * Initialize Super Admin System
 * This script sets up all necessary components for the super admin functionality
 */
async function initializeSuperAdmin() {
  try {
    console.log('🚀 Initializing Super Admin System...');

    // 1. Initialize System Settings
    await initializeSystemSettings();
    console.log('✅ System settings initialized');

    // 2. Create default super admin user
    await createDefaultSuperAdmin();
    console.log('✅ Default super admin created');

    // 3. Create sample tenants for testing
    await createSampleTenants();
    console.log('✅ Sample tenants created');

    // 4. Initialize activity logging
    await initializeActivityLogs();
    console.log('✅ Activity logging initialized');

    // 5. Create system notifications
    await createSystemNotifications();
    console.log('✅ System notifications created');

    // 6. Initialize sample subscriptions
    await initializeSampleSubscriptions();
    console.log('✅ Sample subscriptions created');

    // 7. Create sample reports
    await createSampleReports();
    console.log('✅ Sample reports created');

    // 8. Initialize backup system
    await initializeBackupSystem();
    console.log('✅ Backup system initialized');

    console.log('🎉 Super Admin System initialization completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Login with super admin credentials');
    console.log('2. Configure system settings');
    console.log('3. Set up email and payment providers');
    console.log('4. Create your first tenant');
    console.log('5. Monitor system health');

  } catch (error) {
    console.error('❌ Error initializing Super Admin System:', error);
    throw error;
  }
}

/**
 * Initialize System Settings
 */
async function initializeSystemSettings() {
  try {
    await SystemSetting.initializeDefaults();
    console.log('   - Default system settings created');
  } catch (error) {
    console.error('   - Error creating system settings:', error);
    throw error;
  }
}

/**
 * Create Default Super Admin User
 */
async function createDefaultSuperAdmin() {
  try {
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'superAdmin' });
    if (existingSuperAdmin) {
      console.log('   - Super admin already exists, skipping creation');
      return;
    }

    // Create super admin user
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);
    const superAdmin = await User.create({
      name: 'Super Administrator',
      email: 'admin@landscaping.com',
      password: hashedPassword,
      role: 'superAdmin',
      isEmailVerified: true,
      isActive: true
    });

    console.log('   - Super admin created with email: admin@landscaping.com');
    console.log('   - Password: SuperAdmin123!');
    console.log('   - Please change the password after first login');

    // Log the creation
    await ActivityLog.log({
      type: 'user_registered',
      message: 'Super admin user created during system initialization',
      userId: superAdmin._id,
      severity: 'low'
    });

  } catch (error) {
    console.error('   - Error creating super admin:', error);
    throw error;
  }
}

/**
 * Create Sample Tenants
 */
async function createSampleTenants() {
  try {
    const sampleTenants = [
      {
        name: 'Green Gardens Landscaping',
        email: 'admin@greengardens.com',
        subdomain: 'greengardens',
        plan: 'premium',
        status: 'active'
      },
      {
        name: 'Urban Landscaping Pro',
        email: 'contact@urbanpro.com',
        subdomain: 'urbanpro',
        plan: 'basic',
        status: 'active'
      },
      {
        name: 'Elite Landscape Design',
        email: 'info@elitelandscape.com',
        subdomain: 'elite',
        plan: 'enterprise',
        status: 'active'
      }
    ];

    for (const tenantData of sampleTenants) {
      const existingTenant = await Tenant.findOne({ subdomain: tenantData.subdomain });
      if (!existingTenant) {
        const tenant = await Tenant.create(tenantData);
        
        // Create admin user for tenant
        const hashedPassword = await bcrypt.hash('TenantAdmin123!', 12);
        const adminUser = await User.create({
          name: `${tenant.name} Admin`,
          email: tenant.email,
          password: hashedPassword,
          role: 'tenantAdmin',
          tenantId: tenant._id,
          isEmailVerified: true,
          isActive: true
        });

        // Update tenant with admin user
        tenant.adminId = adminUser._id;
        await tenant.save();

        console.log(`   - Created tenant: ${tenant.name} (${tenant.subdomain})`);
        console.log(`     Admin email: ${tenant.email}, Password: TenantAdmin123!`);

        // Log the creation
        await ActivityLog.log({
          type: 'tenant_created',
          message: `Sample tenant "${tenant.name}" created during initialization`,
          userId: adminUser._id,
          tenantId: tenant._id,
          severity: 'low'
        });
      }
    }
  } catch (error) {
    console.error('   - Error creating sample tenants:', error);
    throw error;
  }
}

/**
 * Initialize Activity Logs
 */
async function initializeActivityLogs() {
  try {
    // Create sample activity logs
    const sampleLogs = [
      {
        type: 'system_warning',
        message: 'System initialization completed successfully',
        severity: 'low',
        metadata: { component: 'super_admin_init' }
      },
      {
        type: 'system_warning',
        message: 'Default settings loaded',
        severity: 'low',
        metadata: { component: 'system_settings' }
      },
      {
        type: 'system_warning',
        message: 'Sample data created for testing',
        severity: 'low',
        metadata: { component: 'sample_data' }
      }
    ];

    for (const logData of sampleLogs) {
      await ActivityLog.log(logData);
    }

    console.log('   - Sample activity logs created');
  } catch (error) {
    console.error('   - Error creating activity logs:', error);
    throw error;
  }
}

/**
 * Create System Notifications
 */
async function createSystemNotifications() {
  try {
    const systemNotifications = [
      {
        title: 'Welcome to Landscaping Management System',
        message: 'Your super admin account has been successfully created. Please review and configure system settings.',
        type: 'info',
        priority: 'medium',
        targetAudience: 'super_admin',
        channels: { in_app: true, email: false }
      },
      {
        title: 'System Initialization Complete',
        message: 'The system has been initialized with default settings and sample data. You can now start managing tenants.',
        type: 'success',
        priority: 'medium',
        targetAudience: 'super_admin',
        channels: { in_app: true, email: false }
      }
    ];

    for (const notificationData of systemNotifications) {
      await Notification.createNotification(notificationData);
    }

    console.log('   - System notifications created');
  } catch (error) {
    console.error('   - Error creating notifications:', error);
    throw error;
  }
}

/**
 * Initialize Sample Subscriptions
 */
async function initializeSampleSubscriptions() {
  try {
    const tenants = await Tenant.find({ status: 'active' });
    
    for (const tenant of tenants) {
      const existingSubscription = await Subscription.findOne({ tenantId: tenant._id });
      if (!existingSubscription) {
        const planPrices = {
          basic: 29,
          premium: 79,
          enterprise: 199
        };

        await Subscription.createSubscription({
          tenantId: tenant._id,
          plan: tenant.plan,
          billingCycle: 'monthly',
          amount: planPrices[tenant.plan],
          currency: 'USD',
          trialDays: 14
        });

        console.log(`   - Created subscription for ${tenant.name}`);
      }
    }
  } catch (error) {
    console.error('   - Error creating subscriptions:', error);
    throw error;
  }
}

/**
 * Create Sample Reports
 */
async function createSampleReports() {
  try {
    const sampleReports = [
      {
        name: 'System Overview Report',
        type: 'tenant_analytics',
        format: 'json',
        filters: {},
        isRecurring: true,
        frequency: 'weekly'
      },
      {
        name: 'Revenue Summary',
        type: 'revenue_analytics',
        format: 'csv',
        filters: {},
        isRecurring: true,
        frequency: 'monthly'
      }
    ];

    const superAdmin = await User.findOne({ role: 'superAdmin' });
    
    for (const reportData of sampleReports) {
      await Report.createReport({
        ...reportData,
        createdBy: superAdmin._id
      });
    }

    console.log('   - Sample reports created');
  } catch (error) {
    console.error('   - Error creating reports:', error);
    throw error;
  }
}

/**
 * Initialize Backup System
 */
async function initializeBackupSystem() {
  try {
    const superAdmin = await User.findOne({ role: 'superAdmin' });
    
    await Backup.createBackup({
      name: 'Initial System Backup',
      type: 'full',
      compression: 'gzip',
      retention: '30_days',
      isAutomated: true,
      isRecurring: true,
      frequency: 'daily',
      createdBy: superAdmin._id,
      notes: 'Automated daily backup for system data'
    });

    console.log('   - Backup system initialized');
  } catch (error) {
    console.error('   - Error initializing backup system:', error);
    throw error;
  }
}

/**
 * Reset Super Admin System (Dangerous - removes all data)
 */
async function resetSuperAdminSystem() {
  try {
    console.log('⚠️  WARNING: This will delete ALL data!');
    console.log('Are you sure you want to continue? (y/N)');
    
    // In a real implementation, you would prompt for confirmation
    // For now, we'll just log the warning
    
    console.log('Reset cancelled for safety. Use with extreme caution.');
  } catch (error) {
    console.error('❌ Error resetting system:', error);
    throw error;
  }
}

/**
 * Check System Health
 */
async function checkSystemHealth() {
  try {
    console.log('🔍 Checking System Health...');

    // Check database connection
    const dbState = mongoose.connection.readyState;
    console.log(`   - Database: ${dbState === 1 ? '✅ Connected' : '❌ Disconnected'}`);

    // Check super admin user
    const superAdmin = await User.findOne({ role: 'superAdmin' });
    console.log(`   - Super Admin: ${superAdmin ? '✅ Exists' : '❌ Missing'}`);

    // Check system settings
    const settingsCount = await SystemSetting.countDocuments();
    console.log(`   - System Settings: ${settingsCount > 0 ? '✅ Loaded' : '❌ Missing'}`);

    // Check tenants
    const tenantCount = await Tenant.countDocuments();
    console.log(`   - Tenants: ${tenantCount} found`);

    // Check subscriptions
    const subscriptionCount = await Subscription.countDocuments();
    console.log(`   - Subscriptions: ${subscriptionCount} found`);

    console.log('✅ System health check completed');
  } catch (error) {
    console.error('❌ Error checking system health:', error);
    throw error;
  }
}

module.exports = {
  initializeSuperAdmin,
  resetSuperAdminSystem,
  checkSystemHealth
};

// Run initialization if this file is executed directly
if (require.main === module) {
  const connectDB = require('../config/db');
  
  connectDB()
    .then(() => initializeSuperAdmin())
    .then(() => {
      console.log('🎉 Initialization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Initialization failed:', error);
      process.exit(1);
    });
} 