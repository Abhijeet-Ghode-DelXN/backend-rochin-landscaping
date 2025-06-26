const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tenant = require('../models/tenant.model');
const User = require('../models/user.model');

// Load env vars
dotenv.config({ path: './.env' });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

const createTenantAndAdmin = async () => {
  // --- Define Data ---
  const adminEmail = 'jane@rochinlandscaping.com';
  const tenantSubdomain = 'rochin-landscaping';

  // Check if records already exist
  const adminExists = await User.findOne({ email: adminEmail });
  const tenantExists = await Tenant.findOne({ subdomain: tenantSubdomain });

  if (adminExists || tenantExists) {
    console.log('Admin or Tenant already exists. Aborting.');
    return;
  }

  // Step 1: Create the admin user with a temporary 'customer' role
  const adminUser = await User.create({
    name: 'Jane Doe',
    email: adminEmail,
    password: 'password123',
    role: 'customer', // Temporary role
  });
  console.log(`User created with temporary role: ${adminUser.email}`);

  // Step 2: Create the tenant, owned by the new user
  const tenant = await Tenant.create({
    name: 'Rochin Landscaping',
    email: 'contact@rochinlandscaping.com',
    subdomain: tenantSubdomain,
    owner: adminUser._id,
  });
  console.log(`Tenant created: ${tenant.name}`);

  // Step 3: Update the user with the correct role and tenantId
  adminUser.role = 'tenantAdmin';
  adminUser.tenantId = tenant._id;
  await adminUser.save();
  console.log(`User role updated to 'tenantAdmin' and linked to tenant.`);

  console.log('Tenant and Admin creation process finished successfully.');
};

const run = async () => {
  try {
    await connectDB();
    await createTenantAndAdmin();
  } catch (error) {
    console.error('An error occurred during the script execution:', error);
    // Attempt to clean up if the script failed midway
    await User.deleteOne({ email: 'jane@rochinlandscaping.com' });
    await Tenant.deleteOne({ subdomain: 'rochin-landscaping' });
    throw error; // Re-throw to ensure process exits with error code
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

run().catch(() => process.exit(1));

