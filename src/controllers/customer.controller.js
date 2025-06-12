const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const { Readable } = require('stream');
const crypto = require('crypto');



// @desc    Get all customers
// @route   GET /api/v1/customers
// @access  Private/Admin
exports.getCustomers = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single customer
// @route   GET /api/v1/customers/:id
// @access  Private/Admin
exports.getCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('appointments')
    .populate('estimates')
    .lean({ virtuals: true }); // Add this to include virtuals

  if (!customer) {
    return next(
      new ErrorResponse(`Customer not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: customer
  });
});





// @desc    Get current customer profile
// @route   GET /api/v1/customers/me
// @access  Private/Customer



// exports.getMyProfile = asyncHandler(async (req, res, next) => {
//   const customer = await Customer.findOne({ user: req.user.id })
//     .populate('appointments')
//     .populate('estimates');

//   if (!customer) {
//     return next(
//       new ErrorResponse(`No customer profile found for this user`, 404)
//     );
//   }

//   res.status(200).json({
//     success: true,
//     data: customer
//   });
// });




exports.getMyProfile = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user.id })
    .populate('appointments')
    .populate('estimates')
    .populate('user', 'name email phone'); // 👈 Only select needed fields

  if (!customer) {
    return next(
      new ErrorResponse(`No customer profile found for this user`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: customer
  });
});









// // @desc    Create customer profile
// // @route   POST /api/v1/customers
// // @access  Private/Admin
// exports.createCustomer = asyncHandler(async (req, res, next) => {
//    const user = await User.create({
//     name: req.body.name,
//     email: req.body.email,
//     phone: req.body.phone,
//     role: req.body.role || 'customer',
//     password: tempPassword,
//     needsPasswordReset: true
//   });

//   // Return both message AND user ID
//   res.status(201).json({
//     success: true,
//     data: {
//       message: 'Registration successful. Please check your email to set your password.',
//       userId: user._id
//     }
//   });
// });


// @desc    Create customer (admin)
// @route   POST /api/v1/customers
// @access  Private/Admin

exports.createCustomerByAdmin = asyncHandler(async (req, res, next) => {
  const { name, email, phone, role, address } = req.body;

  // Validate fields
  if (!name || !email || !phone) {
    return next(new ErrorResponse('Please provide name, email, and phone', 400));
  }

  // Enhanced email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new ErrorResponse('Invalid email format', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse('User already exists', 400));
  }

  let user;
  try {
    // Generate temporary password
    const tempPassword = crypto.randomBytes(4).toString('hex');
    
    // Create user with enhanced validation
    user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.replace(/\D/g, ''), // Remove non-digit characters
      password: tempPassword,
      role: role || 'customer',
      needsPasswordReset: true
    });

    // Generate reset token
    const passwordSetupToken = user.getPasswordSetupToken();
    await user.save({ validateBeforeSave: false });

    // Create customer profile
    const customerData = {
      user: user._id,
      address: address || {
        street: 'N/A',
        city: 'N/A',
        state: 'N/A',
        zipCode: '00000'
      },
      propertyDetails: {
        size: req.body.propertySize || 1000,
        image: {
          url: req.body.imageUrl || "",
          publicId: req.body.imagePublicId || ""
        },
        features: req.body.features || {
          hasFrontYard: true,
          hasBackYard: true,
          hasTrees: false,
          hasGarden: false,
          hasSprinklerSystem: false
        }
      }
    };

    const customer = await Customer.create(customerData);

    // Try to send email (but don't fail the whole operation if email fails)
    try {
      const setupUrl = `${process.env.FRONTEND_URL}/auth/set-password/${passwordSetupToken}`;
      const message = `...`; // your email template
      
      await sendEmail({
        email: user.email,
        subject: 'Complete Your Account Setup',
        html: message
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      success: true,
      data: {
        message: 'Customer created successfully',
        userId: user._id,
        customerId: customer._id,
        tempPassword: tempPassword // For debugging, remove in production
      }
    });

  } catch (err) {
    console.error('Detailed error:', {
      message: err.message,
      stack: err.stack,
      errors: err.errors // Mongoose validation errors
    });

    // Clean up
    if (user) {
      try {
        await User.findByIdAndDelete(user._id);
        await Customer.deleteOne({ user: user._id });
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
    }

    return next(new ErrorResponse(
      err.message || 'Failed to create customer', 
      err.statusCode || 500
    ));
  }
});

// const cloudinary = require('cloudinary').v2;

// exports.uploadPropertyImage = asyncHandler(async (req, res, next) => {
//   try {
//     // 1. Verify the request contains a file
//     if (!req.body.file) {
//       return next(new ErrorResponse('No file data received', 400));
//     }

//     // 2. Find the customer
//     const customer = await Customer.findById(req.params.id);
//     if (!customer) {
//       return next(new ErrorResponse('Customer not found', 404));
//     }

//     // 3. Upload to Cloudinary directly from base64
//     const result = await cloudinary.uploader.upload(req.body.file, {
//       folder: 'property-images',
//       width: 600,
//       crop: "scale"
//     });

//     // 4. Delete old image if exists
//     if (customer.propertyDetails.image?.publicId) {
//       await cloudinary.uploader.destroy(customer.propertyDetails.image.publicId);
//     }

//     // 5. Update customer record
//     customer.propertyDetails.image = {
//       url: result.secure_url,
//       publicId: result.public_id
//     };

//     await customer.save();

//     res.status(200).json({
//       success: true,
//       data: customer
//     });

//   } catch (err) {
//     console.error('Cloudinary upload error:', err);
//     return next(new ErrorResponse('Image upload failed', 500));
//   }
// });


const cloudinary = require('cloudinary').v2;



// const cloudinary = require('cloudinary').v2;

exports.uploadPropertyImages = asyncHandler(async (req, res, next) => {
  try {
    // 1. Find the customer
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new ErrorResponse('Customer not found', 404));
    }

    // 2. Extract files correctly
    let files = [];
    if (req.files) {
      // Handle single file upload
      if (req.files.file && !Array.isArray(req.files.file)) {
        files = [req.files.file];
      } 
      // Handle multiple files
      else if (req.files.files && Array.isArray(req.files.files)) {
        files = req.files.files;
      }
      // Handle field named 'images'
      else if (req.files.images) {
        files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      }
    }

    if (files.length === 0) {
      return next(new ErrorResponse('Please upload at least one image file', 400));
    }

    // 3. Process uploads
    const uploadPromises = files.map(file => {
      // Validate file
      if (!file.mimetype.startsWith('image')) {
        throw new Error(`File ${file.name} is not an image`);
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error(`File ${file.name} exceeds size limit of 5MB`);
      }

      return cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'property_images',
      });
    });

    const uploadResults = await Promise.all(uploadPromises);

    // 4. Prepare images data for database
    const imagesToAdd = uploadResults.map(result => ({
      url: result.secure_url,
      publicId: result.public_id,
      createdAt: new Date()
    }));

    // 5. Update customer with new images
    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      { 
        $push: { 
          'propertyDetails.images': {
            $each: imagesToAdd,
            $position: 0 // Add new images at the beginning
          } 
        } 
      },
      { 
        new: true,
        runValidators: true,
        select: 'propertyDetails.images' // Only return the images array
      }
    );

    if (!updatedCustomer) {
      throw new Error('Failed to update customer with new images');
    }

    // 6. Return the updated images array
    res.status(200).json({
      success: true,
      data: updatedCustomer.propertyDetails.images
    });

  } catch (err) {
    console.error('Upload error:', err);
    
    // Clean up any uploaded images if error occurred
    if (uploadResults) {
      await Promise.all(
        uploadResults.map(result => 
          cloudinary.uploader.destroy(result.public_id).catch(e => console.error(e))
        )
      );
    }
    
    return next(
      new ErrorResponse(err.message || 'Image upload failed', err.statusCode || 500)
    );
  }
});



exports.deletePropertyImage = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return next(new ErrorResponse('Customer not found', 404));
  }

  if (!customer.propertyDetails?.images) {
    return next(new ErrorResponse('No images found', 404));
  }

  const imageId = req.params.imageId;
  
  // Find the image by either _id (MongoDB ID) or publicId (Cloudinary ID)
  const imageToDelete = customer.propertyDetails.images.find(
    img => (img._id && img._id.toString() === imageId) || img.publicId === imageId
  );

  if (!imageToDelete) {
    return next(new ErrorResponse('Image not found', 404));
  }

  try {
    // Delete from Cloudinary
    await cloudinary.uploader.destroy(imageToDelete.publicId);

    // Remove from database array - safely handle cases where _id might be undefined
    customer.propertyDetails.images = customer.propertyDetails.images.filter(
      img => (img._id ? img._id.toString() !== imageId : true) && img.publicId !== imageId
    );
    
    await customer.save();

    res.status(200).json({
      success: true,
      data: customer.propertyDetails.images // Return updated images array
    });
  } catch (err) {
    console.error('Delete error:', err);
    return next(new ErrorResponse('Image deletion failed', 500));
  }
});






// @desc    Update customer profile
// @route   PUT /api/v1/customers/:id
// @access  Private/Admin
// exports.updateCustomer = asyncHandler(async (req, res, next) => {
//   let customer = await Customer.findById(req.params.id);

//   if (!customer) {
//     return next(
//       new ErrorResponse(`Customer not found with id of ${req.params.id}`, 404)
//     );
//   }

//   customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true
//   });

//   res.status(200).json({
//     success: true,
//     data: customer
//   });
// });

exports.updateCustomer = asyncHandler(async (req, res, next) => {
  const { user, address } = req.body;
  
  // First update the user
  const updatedUser = await User.findByIdAndUpdate(
    req.body.userId, // You'll need to send this from frontend
    {
      name: user.name,
      email: user.email,
      phone: user.phone
    },
    { new: true, runValidators: true }
  );

  // Then update the customer
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    {
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country
      }
    },
    { new: true, runValidators: true }
  ).populate('user');

  if (!customer) {
    return next(new ErrorResponse(`Customer not found`, 404));
  }

  res.status(200).json({
    success: true,
    data: customer
  });
});





// @desc    Update current customer profile
// @route   PUT /api/v1/customers/me
// @access  Private/Customer
// exports.updateMyProfile = asyncHandler(async (req, res, next) => {
//   let customer = await Customer.findOne({ user: req.user.id });

//   if (!customer) {
//     return next(
//       new ErrorResponse(`No customer profile found for this user`, 404)
//     );
//   }

//   customer = await Customer.findByIdAndUpdate(customer._id, req.body, {
//     new: true,
//     runValidators: true
//   });

//   res.status(200).json({
//     success: true,
//     data: customer
//   });
// });





// @desc    Update current customer profile
// @route   PUT /api/v1/customers/me
// @access  Private/Customer
exports.updateMyProfile = asyncHandler(async (req, res, next) => {
  // Find the customer profile
  let customer = await Customer.findOne({ user: req.user.id }).populate('user');

  if (!customer) {
    return next(new ErrorResponse(`No customer profile found for this user`, 404));
  }

  // Update user data if provided
  if (req.body.user) {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        name: req.body.user.name,
        email: req.body.user.email
      },
      { new: true, runValidators: true }
    );

    // Update customer's reference to user if needed
    customer.user = user;
  }

  // Update customer data
  const fieldsToUpdate = {
    phone: req.body.phone,
    address: req.body.address,
    propertyDetails: req.body.propertyDetails
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(
    key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  customer = await Customer.findByIdAndUpdate(customer._id, fieldsToUpdate, {
    new: true,
    runValidators: true
  }).populate('user');

  res.status(200).json({
    success: true,
    data: customer
  });
});

// @desc    Delete customer
// @route   DELETE /api/v1/customers/:id
// @access  Private/Admin
exports.deleteCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return next(
      new ErrorResponse(`Customer not found with id of ${req.params.id}`, 404)
    );
  }

   await customer.deleteOne(); 

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get customer service history
// @route   GET /api/v1/customers/:id/history
// @access  Private/Admin
exports.getCustomerHistory = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id)
    .populate({
      path: 'appointments',
      populate: {
        path: 'service',
        select: 'name category'
      },
      options: { sort: { date: -1 } }
    });

  if (!customer) {
    return next(
      new ErrorResponse(`Customer not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    count: customer.appointments.length,
    data: customer.appointments
  });
});

// @desc    Get my service history
// @route   GET /api/v1/customers/me/history
// @access  Private/Customer
exports.getMyServiceHistory = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user.id })
    .populate({
      path: 'appointments',
      populate: {
        path: 'service',
        select: 'name category'
      },
      options: { sort: { date: -1 } }
    });

  if (!customer) {
    return next(
      new ErrorResponse(`No customer profile found for this user`, 404)
    );
  }

  res.status(200).json({
    success: true,
    count: customer.appointments.length,
    data: customer.appointments
  });
}); 