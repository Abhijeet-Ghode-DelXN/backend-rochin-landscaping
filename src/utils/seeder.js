const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');

// Load env vars
dotenv.config();

// Load models
const User = require('../models/user.model');
const Customer = require('../models/customer.model');
const Service = require('../models/service.model');
const Appointment = require('../models/appointment.model');
const Estimate = require('../models/estimate.model');
const Payment = require('../models/payment.model');
const Tenant = require('../models/tenant.model');

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

// Read JSON files
const users = JSON.parse(
  fs.readFileSync(`${__dirname}/data/users.json`, 'utf-8')
);

const customers = JSON.parse(
  fs.readFileSync(`${__dirname}/data/customers.json`, 'utf-8')
);

const services = JSON.parse(
  fs.readFileSync(`${__dirname}/data/services.json`, 'utf-8')
);

const appointments = JSON.parse(
  fs.readFileSync(`${__dirname}/data/appointments.json`, 'utf-8')
);

const estimates = JSON.parse(
  fs.readFileSync(`${__dirname}/data/estimates.json`, 'utf-8')
);

// Import into DB
const importData = async () => {
  try {
    await User.create(users);
    await Customer.create(customers);
    await Service.create(services);
    await Appointment.create(appointments);
    await Estimate.create(estimates);
    
    console.log('Data Imported...'.green.inverse);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await Payment.deleteMany();
    await Appointment.deleteMany();
    await Estimate.deleteMany();
    await Service.deleteMany();
    await Customer.deleteMany();
    await User.deleteMany();
    
    console.log('Data Destroyed...'.red.inverse);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Seed tenants and admins
const seedTenantsAndAdmins = async () => {
  try {
    // Clear existing data
    await Tenant.deleteMany();
    await User.deleteMany();

    // Create tenants
    const tenant1 = await Tenant.create({
      name: 'GreenScape',
      subdomain: 'greenscape',
      owner: new mongoose.Types.ObjectId(), // Placeholder, replace with actual owner if needed
    });

    const tenant2 = await Tenant.create({
      name: 'UrbanGardens',
      subdomain: 'urbangardens',
      owner: new mongoose.Types.ObjectId(), // Placeholder
    });

    // Create admin users for each tenant
    await User.create([
      {
        name: 'Admin GreenScape',
        email: 'admin@greenscape.com',
        password: 'password123',
        role: 'tenantAdmin',
        tenantId: tenant1._id,
      },
      {
        name: 'Admin UrbanGardens',
        email: 'admin@urbangardens.com',
        password: 'password123',
        role: 'tenantAdmin',
        tenantId: tenant2._id,
      },
    ]);

    console.log('Tenants and admin users seeded...'.cyan.inverse);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else if (process.argv[2] === '-t') {
  seedTenantsAndAdmins();
} else {
  console.log('Please add proper flag: -i (import), -d (delete), or -t (seed tenants)');
  process.exit(1);
}