const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const User = require('../models/user.model');
const Customer = require('../models/customer.model');
const sendEmail = require('../utils/sendEmail');
const validator = require('validator');

// // @desc    Register user
// // @route   POST /api/v1/auth/register
// // @access  Public
// exports.register = asyncHandler(async (req, res, next) => {
//   const { name, email, password, role, phone } = req.body;

  
//   // Validate fields
//   if (!name || !email || !password || !role) {
//     return next(new ErrorResponse('Please provide all required fields', 400));
//   }




   
//   // ✅ Step 1: Check email format with stricter validation using regex
//   const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;


//   if (!emailRegex.test(email)) {
//     return next(new ErrorResponse('Invalid email format', 400));
//   }
//   // Password strength validation (minimum 8 characters)
//   if (!validator.isLength(password, { min: 8 })) {
//     return next(new ErrorResponse('Password must be at least 8 characters long', 400));
//   }




//   // Create user
//   const user = await User.create({
//     name,
//     email,
//     password,
//     phone,
//     role,
    
//   });

//   // Create verification token
//   const verificationToken = user.getEmailVerificationToken();
//   await user.save({ validateBeforeSave: false });

//   // Create verification URL
//   const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;
//   const message = `You are receiving this email because you need to confirm your email address. Please make a GET request to: \n\n ${verificationUrl}`;
//   console.log('Verification URL (dev):', verificationUrl);
  
//   try {
//     try {
//       await sendEmail({
//         email: user.email,
//         subject: 'Email Verification',
//         message
//       });
//       console.log('Verification email sent successfully');
//     } catch (emailError) {
//       console.error('Email error, but continuing registration process:', emailError);
//       // In development, we'll continue without sending email
//       if (process.env.NODE_ENV === 'production') {
//         throw emailError; // Only throw in production
//       }
//     }

//     let customer = null;

//     // If user role is customer, create customer profile
//     if (role === 'customer') {
//       try {
//         console.log('Creating customer profile with the following data:');
//         const customerData = {
//           user: user._id,
//           address: {
//             street: 'N/A',
//             city: 'N/A',
//             state: 'N/A',
//             zipCode: '00000'
//           },
//           propertyDetails: {
//             size: 1000, // Set a default property size
//             features: {
//               hasFrontYard: true,
//               hasBackYard: true,
//               hasTrees: false,
//               hasGarden: false,
//               hasSprinklerSystem: false
//             }
//           },
//           servicePreferences: {
//             preferredTimeOfDay: 'Any'
//           },
//           notificationPreferences: {
//             email: true
//           }
//         };
//         console.log(JSON.stringify(customerData, null, 2));
        
//         // Create the customer
//         customer = await Customer.create(customerData);
//         console.log('Customer created successfully:', customer._id);
//       } catch (customerError) {
//         console.error('Error creating customer profile:', customerError);
//         // We'll continue the registration process even if customer creation fails
//         // In a production app, you might want to roll back the user creation too
//       }
//     }

//     sendTokenResponse(user, 201, res, customer);
//   } catch (err) {
//     console.log(err);
//     user.emailVerificationToken = undefined;
//     user.emailVerificationExpire = undefined;
//     await user.save({ validateBeforeSave: false });

//     return next(new ErrorResponse('Email could not be sent', 500));
//   }
// });



// @desc    Register user (initial step)
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, phone } = req.body;

  // Validate fields
  if (!name || !email || !phone) {
    return next(new ErrorResponse('Please provide all required fields', 400));
  }

  // Email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return next(new ErrorResponse('Invalid email format', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse('User already exists', 400));
  }

  // Create user with temporary password and needsPasswordReset flag
  const tempPassword = crypto.randomBytes(4).toString('hex');
  const user = await User.create({
    name,
    email,
    phone,
    password: tempPassword,
    role: 'customer',
    needsPasswordReset: true
  });

  // Create password setup token (expires in 24 hours)
  const passwordSetupToken = user.getPasswordSetupToken();
  await user.save({ validateBeforeSave: false });

  // Create password setup URL
 const setupUrl = `${process.env.FRONTEND_URL}/auth/set-password/${passwordSetupToken}`;

  // const setupUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/set-password/${passwordSetupToken}`;
  // Email content
  const message = `
    <h2>Welcome to Your Landscaping Company!</h2>
    <p>Thank you for registering. Please set your password to complete your account setup:</p>
    <p><a href="${setupUrl}" style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Set Your Password</a></p>
    <p>This link will expire in 24 hours.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Complete Your Registration',
      html: message
    });

    // Create customer profile
    const customerData = {
      user: user._id,
      address: {
        street: 'N/A',
        city: 'N/A',
        state: 'N/A',
        zipCode: '00000'
      },
     
      // discounts: {
      //   firstService: 10 // 10% discount
      // },
       propertyDetails: {
  size: 1000,
  image: {
    url: "", // Initialize with empty string or default image
    publicId: ""
  },
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

    await Customer.create(customerData);

    // Send welcome email (in background)
    setTimeout(async () => {
      const welcomeMessage = `
        <h2>Welcome to Your Landscaping Company!</h2>
        <p>We're thrilled to have you as a customer. Here's what you can expect:</p>
        <ul>
          <li>10% discount on your first service (applied automatically)</li>
          <li>Easy online booking</li>
          <li>Quality service guaranteed</li>
        </ul>
        <p>Ready to get started? <a href="${req.protocol}://${req.get('host')}/book">Book your first service now!</a></p>
      `;

      await sendEmail({
        email: user.email,
        subject: 'Welcome to Your Landscaping Company!',
        html: welcomeMessage
      });
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        message: 'Registration successful. Please check your email to set your password.',
        userId: user._id 
      }
    });
  } catch (err) {
    // Clean up if email fails
    await User.findByIdAndDelete(user._id);
    return next(new ErrorResponse('Email could not be sent', 500));
  }
});






// @desc    Set password after initial registration
// @route   POST /api/v1/auth/set-password
// @access  Public
exports.setPassword = asyncHandler(async (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(new ErrorResponse('Token and password are required', 400));
  }

  // Hash token EXACTLY like in getPasswordSetupToken
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordSetupToken: hashedToken, // Must match the hashed version
    passwordSetupExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  // Set new password
  user.password = password;
  user.needsPasswordReset = false;
  user.passwordSetupToken = undefined;
  user.passwordSetupExpire = undefined;
  await user.save();

  // Send confirmation email
  const message = `
    <h2>Password Updated Successfully</h2>
    <p>Your password has been successfully updated for your account at Your Landscaping Company.</p>
    <p>If you didn't make this change, please contact our support team immediately.</p>
  `;

  await sendEmail({
    email: user.email,
    subject: 'Password Updated',
    html: message
  });

  res.status(200).json({
    success: true,
    data: {
      message: 'Password set successfully. You can now log in.'
    }
  });
});


// @desc    Show password setup form (GET request from email link)
// @route   GET /auth/set-password/:token
// @access  Public
// exports.handlePasswordLink = async (req, res) => {
//   const { token } = req.params;
  
//   // 1. Check if token is valid (same check as your POST route)
//   const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
//   const user = await User.findOne({
//     passwordSetupToken: hashedToken,
//     passwordSetupExpire: { $gt: Date.now() }
//   });

//   // 2. If invalid token
//   if (!user) {
//     return res.status(400).send(`
//       <h1>Link Expired</h1>
//       <p>This password setup link has expired. Please request a new one.</p>
//     `);
//   }

//   // 3. If valid token - redirect to your React frontend
//   res.redirect(`http://localhost:3000/set-password/${token}`);
// };

exports.handlePasswordLink = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  // Hash token (same as in setPassword)
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user
  const user = await User.findOne({
    passwordSetupToken: hashedToken,
    passwordSetupExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid or expired token' 
    });
  }

  // If valid, redirect to frontend
  res.redirect(`${process.env.FRONTEND_URL}/set-password/${token}`);
});






// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
// exports.login = asyncHandler(async (req, res, next) => {
//   const { email, password } = req.body;

//   // Validate email & password
//   if (!email || !password) {
//     return next(new ErrorResponse('Please provide an email and password', 400));
//   }

//   // Check for user
//   const user = await User.findOne({ email }).select('+password');

//   if (!user) {
//     return next(new ErrorResponse('Invalid credentials', 401));
//   }

//   // Check if password matches
//   const isMatch = await user.matchPassword(password);

//   if (!isMatch) {
//     return next(new ErrorResponse('Invalid credentials', 401));
//   }

//   // Update last login
//   user.lastLogin = Date.now();
//   await user.save({ validateBeforeSave: false });

//   // Get customer details if the user is a customer
//   let customer = null;
//   if (user.role === 'customer') {
//     customer = await Customer.findOne({ user: user._id });
//   }

//   // Send the token response, including customer ID if available
//   sendTokenResponse(user, 200, res, customer ? customer._id : null);
// });
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

  // Create user data response
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    createdAt: user.createdAt,
    customerId: customer?._id || null
  };

  // Send the token response with user data
  sendTokenResponse(user, 200, res, userData);
});

// Updated sendTokenResponse function
const sendTokenResponse = (user, statusCode, res, userData) => {
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
      token,
      user: userData
    });
};
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
// const sendTokenResponse = (user, statusCode, res) => {
//   // Create token
//   const token = user.getSignedJwtToken();

//   const options = {
//     expires: new Date(
//       Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
//     ),
//     httpOnly: true
//   };

//   if (process.env.NODE_ENV === 'production') {
//     options.secure = true;
//   }

//   res
//     .status(statusCode)
//     .cookie('token', token, options)
//     .json({
//       success: true,
//       token
//     });
// }; 