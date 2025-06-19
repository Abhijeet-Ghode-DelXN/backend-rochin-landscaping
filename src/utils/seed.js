const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './.env' });

// Load models
const Tenant = require('../models/tenant.model');
const User = require('../models/user.model');

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Read JSON files
const tenants = JSON.parse(
  fs.readFileSync(`${__dirname}/data/tenants.json`, 'utf-8')
);

const users = JSON.parse(
  fs.readFileSync(`${__dirname}/data/users.json`, 'utf-8')
);

// Import into DB
const importData = async () => {
  try {
    await Tenant.create(tenants);
    await User.create(users);
    console.log('Data Imported...');
    process.exit();
  } catch (err) {
    console.error(err);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await Tenant.deleteMany();
    await User.deleteMany();
    console.log('Data Destroyed...');
    process.exit();
  } catch (err) {
    console.error(err);
  }
};

if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
}
