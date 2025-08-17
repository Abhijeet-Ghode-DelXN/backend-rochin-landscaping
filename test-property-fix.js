const mongoose = require('mongoose');
const Property = require('./src/models/property.model');
const Customer = require('./src/models/customer.model');
const User = require('./src/models/user.model');
const Tenant = require('./src/models/tenant.model');
const tenantContext = require('./src/utils/tenantContext');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://abhijeetghodedelxn:c9gCpvu4zSId40c0@unigen.df6iu.mongodb.net/multi-tenant-database?retryWrites=true&w=majority&appName=unigen', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testPropertyCreation() {
  try {
    console.log('Testing property creation with tenant scope plugin...');
    
    // Find a tenant
    const tenant = await Tenant.findOne({ subdomain: 'isaac-gomes-ernandes' });
    if (!tenant) {
      console.error('Tenant not found');
      return;
    }
    console.log('Found tenant:', tenant.name, tenant._id);
    
    // Find a customer
    const customer = await Customer.findOne({ tenants: tenant._id });
    if (!customer) {
      console.error('Customer not found');
      return;
    }
    console.log('Found customer:', customer.name, customer._id);
    
    // Find a user
    const user = await User.findById(customer.user);
    if (!user) {
      console.error('User not found');
      return;
    }
    console.log('Found user:', user.name, user._id);
    
    // Test property creation with tenant context
    await tenantContext.run({ 
      tenantId: tenant._id,
      tenant: tenant
    }, async () => {
      const propertyData = {
        customer: customer._id,
        user: user._id,
        name: 'Test Property',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'AZ',
          zipCode: '85001',
          country: 'USA'
        },
        size: {
          value: 5000,
          unit: 'sqft'
        },
        propertyType: 'residential',
        features: {
          hasFrontYard: true,
          hasBackYard: true
        }
      };
      
      console.log('Creating property with data:', propertyData);
      
      const property = await Property.create(propertyData);
      console.log('Property created successfully:', property._id);
      console.log('Property tenant:', property.tenant);
      console.log('Property tenants array:', property.tenants);
      
      // Clean up
      await Property.findByIdAndDelete(property._id);
      console.log('Test property cleaned up');
    });
    
  } catch (error) {
    console.error('Error testing property creation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

testPropertyCreation();
