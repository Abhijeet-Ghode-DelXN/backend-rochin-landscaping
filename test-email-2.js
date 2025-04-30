const sendEmail = require('./src/utils/sendEmail');

async function main() {
  console.log('Testing email utility...');
  
  try {
    const result = await sendEmail({
      email: 'test@example.com',
      subject: 'Test Email from Landscaping API',
      message: 'This is a test email to verify the email functionality is working.',
      html: '<h1>Email Test</h1><p>This is a test email from the Landscaping API.</p>'
    });
    
    console.log('Test completed successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main(); 