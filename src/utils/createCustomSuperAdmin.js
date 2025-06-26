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

const createCustomSuperAdmin = async () => {
  try {
    // Get credentials from environment variables or use defaults
    const superAdminData = {
      name: process.env.SUPER_ADMIN_NAME || 'Super Administrator',
      email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@landscaping.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2024!',
      role: 'superAdmin',
      phone: process.env.SUPER_ADMIN_PHONE || '+1-555-000-0000',
      isEmailVerified: true,
      createdAt: new Date()
    };

    // Validate required fields
    if (!superAdminData.email || !superAdminData.password) {
      console.error('❌ Error: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required');
      console.log('💡 You can set these in your .env file:');
      console.log('   SUPER_ADMIN_EMAIL=your-email@example.com');
      console.log('   SUPER_ADMIN_PASSWORD=your-secure-password');
      process.exit(1);
    }

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ 
      role: 'superAdmin',
      email: superAdminData.email 
    });

    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists with email:', superAdminData.email);
      console.log('📧 Email:', existingSuperAdmin.email);
      console.log('🆔 User ID:', existingSuperAdmin._id);
      console.log('📅 Created:', existingSuperAdmin.createdAt);
      return;
    }

    // Create super admin
    const superAdmin = await User.create(superAdminData);
    
    console.log('✅ Custom Super Admin created successfully!');
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
    console.log('🚀 Creating Custom Super Admin...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    await createCustomSuperAdmin();
    
    console.log('\n✅ Custom Super Admin creation completed successfully!');
  } catch (error) {
    console.error('❌ Custom Super Admin creation failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed.');
    process.exit(0);
  }
};

// Run the script
run(); 