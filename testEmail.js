require('dotenv').config();
const nodemailer = require('nodemailer');

async function main() {
  console.log('Testing email functionality with Ethereal...');
  
  try {
    // Create a test account
    const testAccount = await nodemailer.createTestAccount();
    console.log('Created test account:', testAccount.user);
    
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    // Send test email
    const info = await transporter.sendMail({
      from: `"Test Sender" <${testAccount.user}>`,
      to: 'test@example.com',
      subject: 'Test Email from Landscaping API',
      text: 'This is a test email to verify the email functionality is working.',
      html: '<h1>Email Test</h1><p>This is a test email from the Landscaping API.</p>'
    });
    
    console.log('Message sent:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('Email test completed successfully!');
  } catch (error) {
    console.error('Email test failed:', error);
  }
}

main().catch(console.error); 