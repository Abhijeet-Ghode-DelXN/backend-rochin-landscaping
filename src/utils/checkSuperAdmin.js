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

const checkSuperAdmin = async () => {
  try {
    const superAdmin = await User.findOne({ role: 'superAdmin' });
    
    if (!superAdmin) {
      console.log('❌ No super admin found in database');
      return;
    }

    console.log('✅ Super Admin found:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${superAdmin.email}`);
    console.log(`👤 Name: ${superAdmin.name}`);
    console.log(`🆔 User ID: ${superAdmin._id}`);
    console.log(`👤 Role: ${superAdmin.role}`);
    console.log(`📅 Created: ${superAdmin.createdAt}`);
    console.log(`✅ Email Verified: ${superAdmin.isEmailVerified}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🔑 Password Information:');
    console.log('• Password is hashed and cannot be retrieved');
    console.log('• If you forgot the password, you can reset it');
    
    console.log('\n💡 To reset password, you can:');
    console.log('1. Use the forgot password feature');
    console.log('2. Delete this user and create a new one');
    console.log('3. Update the password directly in database');

  } catch (error) {
    console.error('❌ Error checking super admin:', error.message);
    throw error;
  }
};

const run = async () => {
  try {
    console.log('🔍 Checking Super Admin...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    await checkSuperAdmin();
    
    console.log('\n✅ Super Admin check completed!');
  } catch (error) {
    console.error('❌ Super Admin check failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed.');
    process.exit(0);
  }
};

// Run the script
run(); 