const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/user.model');

// Load env vars
dotenv.config({ path: './.env' });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected...');
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  }
};

const resetSuperAdmin = async () => {
  try {
    // Delete existing super admin
    const deleteResult = await User.deleteMany({ role: 'superAdmin' });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing super admin(s)`);

    // Create new super admin with proper credentials
    const superAdminData = {
      name: 'Super Administrator',
      email: 'superadmin@landscaping.com',
      password: 'SuperAdmin@2024!',
      role: 'superAdmin',
      phone: '+1-555-000-0000',
      isEmailVerified: true, // This is important!
      createdAt: new Date()
    };

    // Create super admin
    const superAdmin = await User.create(superAdminData);
    
    console.log('✅ Super Admin reset successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${superAdmin.email}`);
    console.log(`🔑 Password: ${superAdminData.password}`);
    console.log(`🆔 User ID: ${superAdmin._id}`);
    console.log(`👤 Role: ${superAdmin.role}`);
    console.log(`✅ Email Verified: ${superAdmin.isEmailVerified}`);
    console.log(`📅 Created: ${superAdmin.createdAt}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🚀 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${superAdmin.email}`);
    console.log(`🔑 Password: ${superAdminData.password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🔐 Security Notes:');
    console.log('• Change the password after first login');
    console.log('• Enable two-factor authentication if available');
    console.log('• Keep these credentials secure');
    console.log('• This user has full system access');

  } catch (error) {
    console.error('❌ Error resetting super admin:', error.message);
    throw error;
  }
};

const run = async () => {
  try {
    console.log('🔄 Resetting Super Admin...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    await resetSuperAdmin();
    
    console.log('\n✅ Super Admin reset completed successfully!');
  } catch (error) {
    console.error('❌ Super Admin reset failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed.');
    process.exit(0);
  }
};

// Run the script
run(); 