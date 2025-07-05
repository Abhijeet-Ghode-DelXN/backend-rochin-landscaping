const mongoose = require('mongoose');
const Announcement = require('./src/models/announcement');
const Tenant = require('./src/models/tenant.model');

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://prajalshetedelxn:Prajal@cluster0.sfnbxic.mongodb.net/multi-tenant-database?retryWrites=true&w=majority&appName=unigen', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createTestAnnouncement() {
  try {
    // Find the tenant
    const tenant = await Tenant.findOne({ subdomain: 'rochin-landscaping' });
    
    let tenantId;
    
    if (!tenant) {
      console.log('Tenant not found. Creating tenant first...');
      const newTenant = await Tenant.create({
        name: 'Rochin Landscaping',
        email: 'contact@rochinlandscaping.com',
        subdomain: 'rochin-landscaping'
      });
      console.log('Tenant created:', newTenant._id);
      tenantId = newTenant._id;
    } else {
      tenantId = tenant._id;
    }

    // Check if announcement already exists
    const existingAnnouncement = await Announcement.findOne({ 
      tenant: tenantId,
      status: 'active'
    });

    if (existingAnnouncement) {
      console.log('Active announcement already exists:', existingAnnouncement);
      return;
    }

    // Create test announcement
    const announcement = await Announcement.create({
      tenant: tenantId,
      title: 'Welcome to Rochin Landscaping!',
      message: 'We are excited to serve you with the best landscaping services. Book your appointment today!',
      status: 'active',
      displayDuration: 10
    });

    console.log('Test announcement created:', announcement);
  } catch (error) {
    console.error('Error creating test announcement:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestAnnouncement(); 