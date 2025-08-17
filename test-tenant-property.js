const axios = require('axios');

// Test property creation with proper tenant context
async function testPropertyWithTenant() {
  try {
    console.log('🚀 Testing Property Creation with Tenant Context...');
    
    // Example API calls with proper headers
    const baseURL = 'http://localhost:5000/api/v1';
    
    console.log('\n📝 Step 1: Login to get JWT token');
    console.log('POST', `${baseURL}/auth/login`);
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'X-Tenant-Subdomain': 'your-tenant-subdomain' // Replace with actual subdomain
    });
    console.log('Body:', {
      email: 'customer@example.com',
      password: 'your_password'
    });
    
    console.log('\n📋 Step 2: Create Property with Tenant Context');
    console.log('POST', `${baseURL}/properties`);
    console.log('Headers:', {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
      'Content-Type': 'application/json',
      'X-Tenant-Subdomain': 'your-tenant-subdomain' // Replace with actual subdomain
    });
    
    const propertyData = {
      name: "My Dream Home",
      address: {
        street: "123 Main Street",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        country: "USA"
      },
      size: {
        value: 2500,
        unit: "sqft"
      },
      propertyType: "residential",
      features: {
        hasFrontYard: true,
        hasBackYard: true,
        hasTrees: true,
        hasGarden: false,
        hasSprinklerSystem: true,
        hasPool: false,
        hasDeck: true,
        hasPatio: true,
        hasFence: true,
        hasIrrigation: false
      },
      accessInstructions: "Gate code: 1234, Key under the mat",
      specialRequirements: "Please be careful with the rose bushes in the front yard"
    };
    
    console.log('Body:', JSON.stringify(propertyData, null, 2));
    
    console.log('\n✅ This should now work!');
    console.log('The system will:');
    console.log('1. Resolve tenant from X-Tenant-Subdomain header');
    console.log('2. Set tenant context automatically');
    console.log('3. Create property with proper tenant association');
    console.log('4. Generate fullAddress automatically');
    console.log('5. Set as default if first property');
    
    console.log('\n🔧 To find your tenant subdomain:');
    console.log('1. Check your database for tenant records');
    console.log('2. Look for the "subdomain" field in the tenants collection');
    console.log('3. Use that subdomain in the X-Tenant-Subdomain header');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPropertyWithTenant();

