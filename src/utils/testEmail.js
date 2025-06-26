require('dotenv').config();
const sendEmail = require('./sendEmail');

/**
 * Test script to verify email functionality
 */
async function testEmailFunctionality() {
  console.log('Testing email functionality...');
  
  try {
    const info = await sendEmail({
      email: 'test@example.com',  // This doesn't need to be real with Ethereal
      subject: 'Test Email from Landscaping API',
      message: 'This is a test email to verify the email functionality is working.',
      html: '<h1>Email Test</h1><p>This is a test email from the Landscaping API.</p>'
    });
    
    console.log('Email test completed successfully!');
    return info;
  } catch (error) {
    console.error('Email test failed:', error);
  }
}

// Run the test if executed directly
if (require.main === module) {
  testEmailFunctionality();
}

module.exports = testEmailFunctionality; 