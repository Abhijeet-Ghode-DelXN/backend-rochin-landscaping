const axios = require('axios');

const testSuperAdminLogin = async () => {
  try {
    console.log('🧪 Testing Super Admin Login...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const loginData = {
      email: 'superadmin@landscaping.com',
      password: 'SuperAdmin@2024!'
    };

    console.log('📧 Email:', loginData.email);
    console.log('🔑 Password:', loginData.password);
    console.log('🌐 API URL: http://localhost:5000/api/v1/auth/login');
    
    const response = await axios.post('http://localhost:5000/api/v1/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Login Successful!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Response Status:', response.status);
    console.log('✅ Success:', response.data.success);
    console.log('👤 User Role:', response.data.data.role);
    console.log('📧 User Email:', response.data.data.email);
    console.log('🆔 User ID:', response.data.data._id);
    console.log('🔑 Token:', response.data.token ? 'Present' : 'Missing');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🎉 Super Admin login test passed!');
    console.log('💡 You can now use these credentials in your frontend application.');

  } catch (error) {
    console.error('\n❌ Login Test Failed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (error.response) {
      console.log('📊 Response Status:', error.response.status);
      console.log('❌ Error Message:', error.response.data.message || error.response.data.error);
      console.log('📋 Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('❌ Network Error: Could not connect to server');
      console.log('💡 Make sure the server is running on port 5000');
    } else {
      console.log('❌ Error:', error.message);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure server is running: npm run dev');
    console.log('2. Check database connection');
    console.log('3. Verify super admin exists: npm run check-superadmin');
    console.log('4. Reset super admin if needed: npm run reset-superadmin');
  }
};

// Run the test
testSuperAdminLogin(); 