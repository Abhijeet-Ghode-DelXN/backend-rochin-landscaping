const PDFDocument = require('pdfkit');

/**
 * Generate a PDF receipt for a payment
 * @param {Object} payment - Payment object with populated fields
 * @returns {Promise<Buffer>} PDF buffer
 */
const generatePDF = async (payment) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });
      
      // Buffer to store PDF
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Add company info
      doc
        .fontSize(20)
        .text('Landscaping Service Receipt', { align: 'center' })
        .moveDown()
        .fontSize(10)
        .text('Landscaping Service Inc.', { align: 'center' })
        .text('123 Green Street, Garden City, CA 12345', { align: 'center' })
        .text('Phone: (555) 123-4567', { align: 'center' })
        .text('Email: support@landscapingservice.com', { align: 'center' })
        .moveDown(2);

      // Add receipt details
      doc
        .fontSize(12)
        .text(`Receipt Number: ${payment.receiptNumber}`)
        .text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`)
        .text(`Payment Method: ${payment.method}`)
        .text(`Status: ${payment.status}`)
        .moveDown();

      // Add customer details
      doc
        .text('Customer Details:')
        .fontSize(10)
        .text(`Name: ${payment.customer.user.name}`)
        .text(`Email: ${payment.customer.user.email}`);
      
      // Add billing address if available
      if (payment.billingAddress) {
        doc.text('Billing Address:')
          .text(`${payment.billingAddress?.street || ''}`)
          .text(`${payment.billingAddress?.city || ''}, ${payment.billingAddress?.state || ''} ${payment.billingAddress?.zipCode || ''}`)
          .text(`${payment.billingAddress?.country || 'USA'}`);
      }
      
      doc.moveDown();

      // Add payment details
      doc
        .fontSize(12)
        .text('Payment Details:')
        .moveDown(0.5);

      // Draw table header
      doc
        .fontSize(10)
        .text('Description', 50, doc.y, { width: 200 })
        .text('Amount', 350, doc.y, { width: 100 });

      // Draw a line
      doc
        .moveTo(50, doc.y + 5)
        .lineTo(550, doc.y + 5)
        .stroke();

      doc.moveDown(0.5);

      // Add payment line item
      let paymentDescription = payment.paymentType;
      
      if (payment.appointment && payment.appointment.service) {
        paymentDescription = `${payment.paymentType} - ${payment.appointment.service.name}`;
      } else if (payment.estimate) {
        paymentDescription = `${payment.paymentType} - Estimate #${payment.estimate.estimateNumber}`;
      }

      doc
        .text(paymentDescription, 50, doc.y, { width: 200 })
        .text(`$${payment.amount.toFixed(2)}`, 350, doc.y, { width: 100 });

      // Draw a line
      doc
        .moveTo(50, doc.y + 15)
        .lineTo(550, doc.y + 15)
        .stroke();

      doc.moveDown();

      // Add total
      doc
        .fontSize(12)
        .text('Total:', 300, doc.y)
        .text(`$${payment.amount.toFixed(2)}`, 350, doc.y);

      // Add refund section if applicable
      if (payment.refund && payment.refund.amount) {
        doc.moveDown()
          .fontSize(12)
          .text('Refund Information:')
          .fontSize(10)
          .text(`Refund Amount: $${payment.refund.amount.toFixed(2)}`)
          .text(`Refund Date: ${new Date(payment.refund.refundedAt).toLocaleDateString()}`)
          .text(`Reason: ${payment.refund.reason}`);
      }

      doc.moveDown(2);

      // Add footer
      doc
        .fontSize(10)
        .text('Thank you for your business!', { align: 'center' })
        .text('This receipt was generated electronically.', { align: 'center' });

      // Finalize PDF
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = generatePDF; 