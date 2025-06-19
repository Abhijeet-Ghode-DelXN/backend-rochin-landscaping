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
    phone,
    role,
    
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
        customer = await Customer.create(customerData);
        console.log('Customer profile created successfully:', customer);
      } catch (customerError) {
        console.error('Error creating customer profile:', customerError);
        // If customer creation fails, we should roll back user creation
        await User.findByIdAndDelete(user._id);
        return next(new ErrorResponse('Failed to create customer profile', 500));
      }
    }

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully. Please check your email to verify your account.' 
    });

  } catch (err) {
    console.error('Registration failed:', err);
    // Clean up created user if registration fails
    await User.findByIdAndDelete(user._id);
    next(err);
  }
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password').populate('tenantId');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId?._id || null,
    tenantName: user.tenantId?.name || null,
  };

  sendTokenResponse(user, 200, res, userData);
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
  // req.user is populated by the 'protect' middleware
  const user = await User.findById(req.user.id).populate('tenantId');

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
    email: req.body.email
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
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please go to this URL to reset your password: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message
    });

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:verificationtoken
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const verificationToken = crypto
    .createHash('sha256')
    .update(req.params.verificationtoken)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken: verificationToken,
    emailVerificationExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid verification token', 400));
  }

  // Mark user as verified
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
});

// @desc    Handle password link
// @route   GET /api/v1/auth/set-password/:token
// @access  Public
exports.handlePasswordLink = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  // Here, you would typically render a page for the user to set their password.
  // For an API, you might just validate the token and send a success response,
  // expecting the frontend to handle the password form.
  res.status(200).send(`
    <html>
      <body>
        <h2>Set Your Password</h2>
        <form action="/api/v1/auth/set-password" method="POST">
          <input type="hidden" name="token" value="${token}" />
          <label for="password">New Password:</label>
          <input type="password" id="password" name="password" required />
          <button type="submit">Set Password</button>
        </form>
      </body>
    </html>
  `);
});

// @desc    Set password
// @route   POST /api/v1/auth/set-password
// @access  Public
exports.setPassword = asyncHandler(async (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(new ErrorResponse('Please provide a token and a new password', 400));
  }

  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.isEmailVerified = true; // Also verify email upon password set
  await user.save();

  sendTokenResponse(user, 200, res);
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
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

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

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

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'Lax' // Default SameSite attribute
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true; // secure must be true if sameSite is 'None'
    options.sameSite = 'None';
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({ success: true, token });
};