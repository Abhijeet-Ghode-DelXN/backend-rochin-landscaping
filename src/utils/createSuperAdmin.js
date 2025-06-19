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

const createSuperAdmin = async () => {
  try {
    // Super admin credentials
    const superAdminData = {
      name: 'Super Administrator',
      email: 'superadmin@landscaping.com',
      password: 'SuperAdmin@2024!', // Strong password
      role: 'superAdmin',
      phone: '+1-555-000-0000',
      isEmailVerified: true,
      createdAt: new Date()
    };

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ 
      role: 'superAdmin',
      email: superAdminData.email 
    });

    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists with email:', superAdminData.email);
      console.log('📧 Email:', existingSuperAdmin.email);
      console.log('🔑 Password: (check your records)');
      console.log('🆔 User ID:', existingSuperAdmin._id);
      return;
    }

    // Create super admin
    const superAdmin = await User.create(superAdminData);
    
    console.log('✅ Super Admin created successfully!');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Password:', superAdminData.password);
    console.log('🆔 User ID:', superAdmin._id);
    console.log('👤 Role:', superAdmin.role);
    console.log('📅 Created:', superAdmin.createdAt);
    
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
    console.error('❌ Error creating super admin:', error.message);
    throw error;
  }
};

const run = async () => {
  try {
    console.log('🚀 Creating Super Admin...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    await createSuperAdmin();
    
    console.log('\n✅ Super Admin creation completed successfully!');
  } catch (error) {
    console.error('❌ Super Admin creation failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed.');
    process.exit(0);
  }
};

// Run the script
run(); 