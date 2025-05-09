const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const User = require('../models/user.model');
const Customer = require('../models/customer.model');
const sendEmail = require('../utils/sendEmail');
const validator = require('validator');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, phone } = req.body;

  
  // Validate fields
  if (!name || !email || !password || !role) {
    return next(new ErrorResponse('Please provide all required fields', 400));
  }




   
  // ✅ Step 1: Check email format with stricter validation using regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;


  if (!emailRegex.test(email)) {
    return next(new ErrorResponse('Invalid email format', 400));
  }
  // Password strength validation (minimum 8 characters)
  if (!validator.isLength(password, { min: 8 })) {
    return next(new ErrorResponse('Password must be at least 8 characters long', 400));
  }




  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
    phone
  });

  // Create verification token
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Create verification URL
  const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;
  const message = `You are receiving this email because you need to confirm your email address. Please make a GET request to: \n\n ${verificationUrl}`;
  console.log('Verification URL (dev):', verificationUrl);
  
  try {
    try {
      await sendEmail({
        email: user.email,
        subject: 'Email Verification',
        message
      });
      console.log('Verification email sent successfully');
    } catch (emailError) {
      console.error('Email error, but continuing registration process:', emailError);
      // In development, we'll continue without sending email
      if (process.env.NODE_ENV === 'production') {
        throw emailError; // Only throw in production
      }
    }

    let customer = null;

    // If user role is customer, create customer profile
    if (role === 'customer') {
      try {
        console.log('Creating customer profile with the following data:');
        const customerData = {
          user: user._id,
          address: {
            street: 'N/A',
            city: 'N/A',
            state: 'N/A',
            zipCode: '00000'
          },
          propertyDetails: {
            size: 1000, // Set a default property size
            features: {
              hasFrontYard: true,
              hasBackYard: true,
              hasTrees: false,
              hasGarden: false,
              hasSprinklerSystem: false
            }
          },
          servicePreferences: {
            preferredTimeOfDay: 'Any'
          },
          notificationPreferences: {
            email: true
          }
        };
        console.log(JSON.stringify(customerData, null, 2));
        
        // Create the customer
        customer = await Customer.create(customerData);
        console.log('Customer created successfully:', customer._id);
      } catch (customerError) {
        console.error('Error creating customer profile:', customerError);
        // We'll continue the registration process even if customer creation fails
        // In a production app, you might want to roll back the user creation too
      }
    }

    sendTokenResponse(user, 201, res, customer);
  } catch (err) {
    console.log(err);
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  // Get customer details if the user is a customer
  let customer = null;
  if (user.role === 'customer') {
    customer = await Customer.findOne({ user: user._id });
  }

  // Send the token response, including customer ID if available
  sendTokenResponse(user, 200, res, customer ? customer._id : null);
});

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  // const user = await User.findOne({ email: req.body.email });
  const user = await User.findOne({ 
    email: { $regex: new RegExp(`^${req.body.email.trim()}$`, 'i') } 
  });

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Create reset url
  // const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;
  // Change this line in forgotPassword function
// const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
// Create reset URL pointing to frontend
const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;


  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

  try {
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message
      });
    } catch (emailError) {
      console.error('Email error, but continuing password reset process:', emailError);
      // In development, we'll continue without sending email
      if (process.env.NODE_ENV === 'production') {
        throw emailError; // Only throw in production
      }
    }

    res.status(200).json({ 
      success: true, 
      data: 'Email sent',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (err) {
    console.log(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:verificationtoken
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const emailVerificationToken = crypto
    .createHash('sha256')
    .update(req.params.verificationtoken)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken,
    emailVerificationExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400));
  }

  // Set email as verified
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token
    });
}; 