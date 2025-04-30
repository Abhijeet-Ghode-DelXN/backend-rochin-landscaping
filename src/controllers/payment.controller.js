const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const Payment = require('../models/payment.model');
const Appointment = require('../models/appointment.model');
const Estimate = require('../models/estimate.model');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const sendEmail = require('../utils/sendEmail');
const generatePDF = require('../utils/generateReceipt');

// @desc    Get all payments
// @route   GET /api/v1/payments
// @access  Private/Admin
exports.getPayments = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single payment
// @route   GET /api/v1/payments/:id
// @access  Private
exports.getPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate({
      path: 'customer',
      select: 'address',
      populate: {
        path: 'user',
        select: 'name email phone'
      }
    })
    .populate('appointment')
    .populate('estimate')
    .populate('processedBy', 'name');

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is authorized to view
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ user: req.user.id });
    if (!customer || payment.customer.toString() !== customer._id.toString()) {
      return next(
        new ErrorResponse(`Not authorized to view this payment`, 403)
      );
    }
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Process payment with Stripe
// @route   POST /api/v1/payments/process
// @access  Private
exports.processPayment = asyncHandler(async (req, res, next) => {
  const { 
    amount, 
    paymentType, 
    cardToken, 
    customerId, 
    appointmentId, 
    estimateId,
    billingAddress
  } = req.body;

  if (!amount || !paymentType || !cardToken) {
    return next(
      new ErrorResponse('Please provide amount, payment type, and card token', 400)
    );
  }

  if (!customerId && !req.user.role === 'customer') {
    return next(
      new ErrorResponse('Customer ID is required', 400)
    );
  }

  // If user is customer, get their customer ID
  let customer;
  if (req.user.role === 'customer') {
    customer = await Customer.findOne({ user: req.user.id });
    if (!customer) {
      return next(new ErrorResponse('Customer profile not found', 404));
    }
  } else {
    customer = await Customer.findById(customerId);
    if (!customer) {
      return next(
        new ErrorResponse(`Customer not found with id of ${customerId}`, 404)
      );
    }
  }

  // Check if paying for appointment or estimate
  if (appointmentId) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return next(
        new ErrorResponse(`Appointment not found with id of ${appointmentId}`, 404)
      );
    }
  } else if (estimateId) {
    const estimate = await Estimate.findById(estimateId);
    if (!estimate) {
      return next(
        new ErrorResponse(`Estimate not found with id of ${estimateId}`, 404)
      );
    }
  }

  // Create a charge using Stripe
  try {
    const customerUser = await User.findById(customer.user);
    
    // Process payment with Stripe
    const charge = await stripe.charges.create({
      amount: amount * 100, // Stripe requires cents
      currency: 'usd',
      source: cardToken,
      description: `Payment for ${paymentType} - Customer: ${customerUser.name}`,
      receipt_email: customerUser.email,
      metadata: {
        customer_id: customer._id.toString(),
        customer_name: customerUser.name,
        payment_type: paymentType,
        appointment_id: appointmentId || 'N/A',
        estimate_id: estimateId || 'N/A'
      }
    });

    // Create payment record
    const payment = await Payment.create({
      customer: customer._id,
      appointment: appointmentId || null,
      estimate: estimateId || null,
      paymentType,
      amount,
      status: 'Completed',
      method: 'Credit Card',
      currency: 'USD',
      gateway: 'Stripe',
      gatewayTransactionId: charge.id,
      receiptUrl: charge.receipt_url,
      billingAddress,
      cardDetails: {
        lastFour: charge.payment_method_details.card.last4,
        brand: charge.payment_method_details.card.brand,
        expiryMonth: charge.payment_method_details.card.exp_month,
        expiryYear: charge.payment_method_details.card.exp_year
      },
      processedBy: req.user.id
    });

    // Update appointment or estimate payment status
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        'payment.status': 'Paid',
        'payment.amount': amount,
        'payment.transactionId': charge.id,
        'payment.paymentDate': Date.now()
      });
    } else if (estimateId && paymentType === 'Deposit') {
      await Estimate.findByIdAndUpdate(estimateId, {
        'deposit.amount': amount,
        'deposit.paymentId': payment._id,
        'deposit.paidOn': Date.now()
      });
    }

    // Send confirmation email
    try {
      await sendEmail({
        email: customerUser.email,
        subject: 'Payment Confirmation',
        message: `Thank you for your payment of $${amount} for ${paymentType}. Your transaction ID is ${charge.id}. A receipt has been sent to your email.`
      });
    } catch (err) {
      console.log('Email notification failed:', err);
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (err) {
    return next(
      new ErrorResponse(`Payment processing failed: ${err.message}`, 500)
    );
  }
});

// @desc    Create manual payment (Admin)
// @route   POST /api/v1/payments/manual
// @access  Private/Admin
exports.createManualPayment = asyncHandler(async (req, res, next) => {
  const { 
    customerId, 
    appointmentId, 
    estimateId, 
    paymentType, 
    amount, 
    method,
    notes 
  } = req.body;

  if (!customerId || !paymentType || !amount || !method) {
    return next(
      new ErrorResponse('Please provide customer ID, payment type, amount, and method', 400)
    );
  }

  // Check if customer exists
  const customer = await Customer.findById(customerId);
  if (!customer) {
    return next(
      new ErrorResponse(`Customer not found with id of ${customerId}`, 404)
    );
  }

  // Create payment record
  const payment = await Payment.create({
    customer: customerId,
    appointment: appointmentId || null,
    estimate: estimateId || null,
    paymentType,
    amount,
    status: 'Completed',
    method,
    currency: 'USD',
    gateway: 'Manual',
    notes,
    processedBy: req.user.id
  });

  // Update appointment or estimate payment status
  if (appointmentId) {
    await Appointment.findByIdAndUpdate(appointmentId, {
      'payment.status': 'Paid',
      'payment.amount': amount,
      'payment.paymentMethod': method,
      'payment.paymentDate': Date.now()
    });
  } else if (estimateId && paymentType === 'Deposit') {
    await Estimate.findByIdAndUpdate(estimateId, {
      'deposit.amount': amount,
      'deposit.paymentId': payment._id,
      'deposit.paidOn': Date.now()
    });
  }

  // Send confirmation email
  try {
    const customerUser = await User.findById(customer.user);
    if (customerUser && customerUser.email) {
      await sendEmail({
        email: customerUser.email,
        subject: 'Payment Received',
        message: `We have received your payment of $${amount} for ${paymentType}. Thank you for your business.`
      });
    }
  } catch (err) {
    console.log('Email notification failed:', err);
  }

  res.status(201).json({
    success: true,
    data: payment
  });
});

// @desc    Get receipt
// @route   GET /api/v1/payments/:id/receipt
// @access  Private
exports.getReceipt = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate({
      path: 'customer',
      populate: {
        path: 'user',
        select: 'name email'
      }
    })
    .populate('appointment', 'date timeSlot service')
    .populate({
      path: 'appointment',
      populate: {
        path: 'service',
        select: 'name'
      }
    })
    .populate('estimate', 'estimateNumber')
    .populate('processedBy', 'name');

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is authorized to view
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ user: req.user.id });
    if (!customer || payment.customer._id.toString() !== customer._id.toString()) {
      return next(
        new ErrorResponse(`Not authorized to view this receipt`, 403)
      );
    }
  }

  // Generate PDF receipt
  const pdfBuffer = await generatePDF(payment);

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.receiptNumber}.pdf`);

  // Send PDF
  res.send(pdfBuffer);
});

// @desc    Process refund
// @route   POST /api/v1/payments/:id/refund
// @access  Private/Admin
exports.processRefund = asyncHandler(async (req, res, next) => {
  const { amount, reason } = req.body;

  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  if (payment.status === 'Refunded') {
    return next(
      new ErrorResponse('This payment has already been refunded', 400)
    );
  }

  // If no amount provided, refund full amount
  const refundAmount = amount || payment.amount;

  try {
    // Process refund with Stripe if it was a Stripe payment
    let stripeRefund;
    if (payment.gateway === 'Stripe' && payment.gatewayTransactionId) {
      stripeRefund = await stripe.refunds.create({
        charge: payment.gatewayTransactionId,
        amount: refundAmount * 100, // Stripe requires cents
        reason: 'requested_by_customer'
      });
    }

    // Update payment record
    payment.status = refundAmount === payment.amount ? 'Refunded' : 'Partially Refunded';
    payment.refund = {
      amount: refundAmount,
      reason: reason || 'Customer requested refund',
      refundedAt: Date.now(),
      refundTransactionId: stripeRefund ? stripeRefund.id : null
    };

    await payment.save();

    // Update appointment payment status if applicable
    if (payment.appointment) {
      await Appointment.findByIdAndUpdate(payment.appointment, {
        'payment.status': payment.status
      });
    }

    // Notify customer
    try {
      const customer = await Customer.findById(payment.customer).populate('user');
      if (customer && customer.user.email) {
        await sendEmail({
          email: customer.user.email,
          subject: 'Refund Processed',
          message: `Your refund of $${refundAmount} has been processed. Reason: ${reason || 'Customer requested refund'}. Please allow 5-7 business days for the funds to appear in your account.`
        });
      }
    } catch (err) {
      console.log('Email notification failed:', err);
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (err) {
    return next(
      new ErrorResponse(`Refund processing failed: ${err.message}`, 500)
    );
  }
});

// @desc    Get my payments (Customer)
// @route   GET /api/v1/payments/my-payments
// @access  Private/Customer
exports.getMyPayments = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user.id });

  if (!customer) {
    return next(new ErrorResponse(`No customer profile found`, 404));
  }

  const payments = await Payment.find({ customer: customer._id })
    .populate('appointment', 'date service status')
    .populate('estimate', 'estimateNumber approvedPackage')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments
  });
}); 