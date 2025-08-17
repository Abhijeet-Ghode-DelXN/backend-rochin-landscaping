const axios = require('axios');

// Test the property creation endpoint
async function testPropertyCreation() {
  try {
    console.log('🚀 Testing Property Creation...');
    
    // First, you need to get a JWT token by logging in
    console.log('\n📝 Step 1: Get JWT Token');
    console.log('Please login first to get your JWT token:');
    console.log('POST http://localhost:5000/api/v1/auth/login');
    console.log('Body: { "email": "your-email", "password": "your-password" }');
    
    // Example property data
    const propertyData = {
      name: "Test Property",
      address: {
        street: "123 Test Street",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        country: "USA"
      },
      size: {
        value: 2000,
        unit: "sqft"
      },
      propertyType: "residential",
      features: {
        hasFrontYard: true,
        hasBackYard: true,
        hasTrees: false,
        hasGarden: false,
        hasSprinklerSystem: true,
        hasPool: false,
        hasDeck: false,
        hasPatio: true,
        hasFence: false,
        hasIrrigation: false
      },
      accessInstructions: "Gate code: 1234",
      specialRequirements: "Please be careful with the plants"
    };
    
    console.log('\n📋 Step 2: Create Property');
    console.log('POST http://localhost:5000/api/v1/properties');
    console.log('Headers: {');
    console.log('  "Authorization": "Bearer YOUR_JWT_TOKEN",');
    console.log('  "Content-Type": "application/json",');
    console.log('  "X-Tenant-Subdomain": "your-tenant-subdomain"  // Add this header!');
    console.log('}');
    console.log('Body:', JSON.stringify(propertyData, null, 2));
    
    console.log('\n✅ Property creation should now work!');
    console.log('The system will automatically:');
    console.log('- Generate the fullAddress from address components');
    console.log('- Set the property as default if it\'s the first one');
    console.log('- Associate it with the current customer and tenant');
    
    console.log('\n🔧 Alternative Solutions:');
    console.log('1. Add X-Tenant-Subdomain header to your request');
    console.log('2. Access the API through a tenant subdomain (e.g., tenant.localhost:5000)');
    console.log('3. The system will now try to get tenant from user.tenantId or customer.tenants as fallback');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPropertyCreation();
