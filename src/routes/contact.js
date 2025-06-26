const express = require('express');
const router = express.Router();
const sendEmail = require('../utils/sendEmail'); // Assuming sendEmail.js is in utils folder

router.post('/', async (req, res) => {
  const { firstName, lastName, email, phone, service, message } = req.body;

  try {
    // Prepare email data
    const emailOptions = {
      email: 'recipient@example.com', // Email to send form data to
      subject: `New Contact Form Submission: ${firstName} ${lastName}`,
      message: `
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Service Interested In:</strong> ${service}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
      html: `
        <h3>Contact Form Submission</h3>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Service Interested In:</strong> ${service}</p>
        <p><strong>Message:</strong> ${message}</p>
      `
    };

    // Call sendEmail function to send the email
    await sendEmail(emailOptions);

    // Send success response
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Error sending email' });
  }
});

module.exports = router;
