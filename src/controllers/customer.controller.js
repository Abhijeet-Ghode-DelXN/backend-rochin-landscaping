const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const { Readable } = require('stream');
const crypto = require('crypto');
const { getTenantFrontendUrl } = require('../utils/tenantUrl');
const tenantContext = require('../utils/tenantContext');
const mongoose = require('mongoose');



// // @desc    Get all customers
// // @route   GET /api/v1/customers
// // @access  Private/Admin
// exports.getCustomers = asyncHandler(async (req, res, next) => {
//   res.status(200).json(res.advancedResults);
// });



// @desc    Get all customers (for current tenant)
// @route   GET /api/v1/customers
// @access  Private/TenantAdmin
exports.getCustomers = asyncHandler(async (req, res, next) => {
  // For tenant admins, only show customers associated with their tenant
  const filter = {};
  
  if (req.user.role === 'tenantAdmin') {
    filter.tenants = req.user.tenantId;
  }

  // Use advancedResults middleware with the filter
  res.advancedResults = {
    ...res.advancedResults,
    data: res.advancedResults.data.filter(customer => 
      customer.tenants.includes(req.user.tenantId)
    )};
  
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
    .populate('user', 'name email phone  address'); // 👈 Only select needed fields

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

  // Get tenant from context
  const store = tenantContext.getStore();
  const tenantId = store?.tenantId;
  if (!tenantId) {
    return next(new ErrorResponse('Tenant context is required to create a customer.', 400));
  }
  const Tenant = require('../models/tenant.model');
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    return next(new ErrorResponse('Tenant not found.', 404));
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
      needsPasswordReset: true,
      tenantId: tenant._id
    });

    // Generate reset token
    const passwordSetupToken = user.getPasswordSetupToken();
    await user.save({ validateBeforeSave: false });

    // Create customer profile
    const customerData = {
      user: user._id,
      tenants: [tenant._id],
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
      const setupUrl = getTenantFrontendUrl(tenant.subdomain, `/auth/set-password/${passwordSetupToken}`);
      const message = `Welcome to ${tenant.name}! An account has been created for you. Please set your password by visiting the following link:\n\n${setupUrl}`;
      
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




// exports.uploadPropertyImages = asyncHandler(async (req, res, next) => {
//   try {
//     // 1. Find the customer and validate property index
//     const customer = await Customer.findById(req.params.id);
//     if (!customer) {
//       return next(new ErrorResponse('Customer not found', 404));
//     }

//     const propertyIndex = parseInt(req.params.propertyIndex);
//     if (isNaN(propertyIndex) || propertyIndex < 0 || propertyIndex >= customer.propertyDetails.length) {
//       return next(new ErrorResponse('Invalid property index', 400));
//     }

//     // 2. Extract files - use 'images' as the field name
//     let files = [];
//     if (req.files) {
//       if (req.files.images) {
//         files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
//       } else {
//         return next(new ErrorResponse('Please upload files using the "images" field name', 400));
//       }
//     }

//     if (files.length === 0) {
//       return next(new ErrorResponse('Please upload at least one image file', 400));
//     }

//     // 3. Process uploads (same as before)
//     const uploadPromises = files.map(file => {
//       if (!file.mimetype.startsWith('image')) {
//         throw new Error(`File ${file.name} is not an image`);
//       }
//       if (file.size > 5 * 1024 * 1024) {
//         throw new Error(`File ${file.name} exceeds size limit of 5MB`);
//       }
//       return cloudinary.uploader.upload(file.tempFilePath, {
//         folder: 'property_images',
//       });
//     });

//     const uploadResults = await Promise.all(uploadPromises);

//     // 4. Prepare images data
//     const imagesToAdd = uploadResults.map(result => ({
//       url: result.secure_url,
//       publicId: result.public_id,
//       createdAt: new Date()
//     }));

//     // 5. Update the specific property's images array
//     const propertyPath = `propertyDetails.${propertyIndex}.images`;
//     const updatedCustomer = await Customer.findByIdAndUpdate(
//       req.params.id,
//       { 
//         $push: { 
//           [propertyPath]: {
//             $each: imagesToAdd,
//             $position: 0
//           } 
//         } 
//       },
//       { 
//         new: true,
//         runValidators: true
//       }
//     );

//     if (!updatedCustomer) {
//       throw new Error('Failed to update customer with new images');
//     }

//     // 6. Return the updated property details
//     res.status(200).json({
//       success: true,
//       data: updatedCustomer.propertyDetails[propertyIndex].images
//     });

//   } catch (err) {
//     console.error('Upload error:', err);
//     if (uploadResults) {
//       await Promise.all(
//         uploadResults.map(result => 
//           cloudinary.uploader.destroy(result.public_id).catch(e => console.error(e))
//       )
//     );
//     }
//     return next(new ErrorResponse(err.message || 'Image upload failed', err.statusCode || 500));
//   }
// });

// const cloudinary = require('cloudinary').v2;

// exports.uploadPropertyImages = asyncHandler(async (req, res, next) => {
//   let uploadResults = [];
  
//   try {
//     const customer = await Customer.findById(req.params.id);
//     if (!customer) {
//       return next(new ErrorResponse('Customer not found', 404));
//     }

//     // Get property name from URL
//     const propertyName = decodeURIComponent(req.params.propertyName);
    
//     // Find property by name (case insensitive)
//     let property = customer.propertyDetails.find(
//       p => p.name.toLowerCase() === propertyName.toLowerCase()
//     );

//     // If property doesn't exist, create it
//     if (!property) {
//       property = {
//         name: propertyName,
//         images: []
//       };
//       customer.propertyDetails.push(property);
//       await customer.save();
//     }

//     // Handle file uploads
//     let files = [];
//     if (req.files?.images) {
//       files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
//     }

//     if (files.length === 0) {
//       return next(new ErrorResponse('Please upload at least one image file', 400));
//     }

//     // Upload to Cloudinary
//     uploadResults = await Promise.all(files.map(file => {
//       if (!file.mimetype.startsWith('image')) {
//         throw new Error(`File ${file.name} is not an image`);
//       }
//       return cloudinary.uploader.upload(file.tempFilePath, {
//   folder: 'property_images',
//   public_id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Force unique public_id
// });
//     }));

//     // Add new images to property
//     const newImages = uploadResults.map(result => ({
//       url: result.secure_url,
//       publicId: result.public_id,
//       createdAt: new Date()
//     }));

//     property.images.push(...newImages);
//     customer.markModified('propertyDetails');
//     await customer.save();

//     res.status(200).json({
//       success: true,
//       data: property.images
//     });

//   } catch (err) {
//     console.error('Upload error:', err);
//     // Clean up any uploaded files on error
//     await Promise.all(
//       uploadResults.map(result => 
//         cloudinary.uploader.destroy(result.public_id).catch(console.error)
//     ));
//     next(new ErrorResponse(err.message || 'Image upload failed', 500));
//   }
// });

const cloudinary = require('cloudinary').v2;

exports.uploadPropertyImages = asyncHandler(async (req, res, next) => {
  let uploadResults = [];
  
  try {
    // 1. Find customer
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new ErrorResponse('Customer not found', 404));
    }

    // 2. Get and validate property
    const propertyName = decodeURIComponent(req.params.propertyName);
    let property = customer.propertyDetails.find(
      p => p.name.toLowerCase() === propertyName.toLowerCase()
    );

    if (!property) {
      property = {
        name: propertyName,
        images: []
      };
      customer.propertyDetails.push(property);
      // Save the new property structure first
      await customer.save();
    }

    // 3. Validate files
    let files = [];
    if (req.files?.images) {
      files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    }

    if (files.length === 0) {
      return next(new ErrorResponse('Please upload at least one image file', 400));
    }

    // 4. Upload to Cloudinary with better error handling
    uploadResults = await Promise.all(files.map(file => {
      if (!file.mimetype.startsWith('image')) {
        throw new Error(`File ${file.name} is not an image`);
      }
      
      // Generate more unique public_id
      const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const originalName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      const publicId = `property_images/${originalName}_${uniqueSuffix}`.replace(/\s+/g, '_');
      
      return cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'property_images',
        public_id: publicId,
        unique_filename: true,
        overwrite: false
      });
    }));

    // 5. Create new image objects with validation
    const newImages = uploadResults.map(result => {
      if (!result.secure_url) {
        throw new Error('Cloudinary did not return a URL');
      }
      
      return {
        url: result.secure_url, // Ensure URL is included
        publicId: result.public_id,
        createdAt: new Date()
      };
    });

    // 6. Add to property and save
    property.images.push(...newImages);
    customer.markModified('propertyDetails');
    
    // Save with error handling
    try {
      await customer.save();
    } catch (saveErr) {
      console.error('Database save error:', saveErr);
      // Clean up Cloudinary uploads if save fails
      await Promise.all(
        uploadResults.map(result => 
          cloudinary.uploader.destroy(result.public_id).catch(console.error)
      ));
      throw new Error('Failed to save image data to database');
    }

    // 7. Return success response with only the new images
    res.status(200).json({
      success: true,
      data: newImages // Return just the newly uploaded images with their URLs
    });

  } catch (err) {
    console.error('Upload error:', err);
    // Clean up any uploaded files on error
    await Promise.all(
      uploadResults.map(result => 
        cloudinary.uploader.destroy(result.public_id).catch(console.error)
      )
    );
    next(new ErrorResponse(err.message || 'Image upload failed', 500));
  }
});



// // @desc    Upload images for a property
// // @route   POST /api/v1/customers/:id/properties/:propertyName/images
// // @access  Private
// exports.uploadPropertyImages = asyncHandler(async (req, res, next) => {
//   // Validate customer ID format
//   if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
//     return next(new ErrorResponse('Invalid customer ID format', 400));
//   }

//   // 1. Find customer with proper error handling
//   const customer = await Customer.findById(req.params.id);
//   if (!customer) {
//     return next(new ErrorResponse(`Customer not found with id of ${req.params.id}`, 404));
//   }

//   // 2. Get and validate property name
//   const propertyName = decodeURIComponent(req.params.propertyName);
//   if (!propertyName || propertyName.trim() === '') {
//     return next(new ErrorResponse('Property name is required', 400));
//   }

//   // 3. Find or initialize property with all required fields
//   let property = customer.propertyDetails.find(
//     p => p.name.toLowerCase() === propertyName.toLowerCase()
//   );

//   if (!property) {
//   property = {
//     name: propertyName,
//     propertyAddress: {
//       street: req.body.street || '',
//       city: req.body.city || '',
//       state: req.body.state || '',
//       zipCode: req.body.zipCode || '',
//       country: req.body.country || 'USA'
//     },
//     size: req.body.size || 0,
//     features: {
//       hasFrontYard: req.body.hasFrontYard || false,
//       hasBackYard: req.body.hasBackYard || false,
//       hasTrees: req.body.hasTrees || false,
//       hasGarden: req.body.hasGarden || false,
//       hasSprinklerSystem: req.body.hasSprinklerSystem || false
//     },
//     accessInstructions: req.body.accessInstructions || '',
//     images: []
//   };
//   customer.propertyDetails.push(property);
// }

//   // 4. Validate files
//   if (!req.files || (!req.files.images && !req.files.image)) {
//     return next(new ErrorResponse('Please upload at least one image file', 400));
//   }

//   let files = [];
//   if (req.files.images) {
//     files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
//   } else if (req.files.image) {
//     files = [req.files.image];
//   }

//   // 5. Process file uploads to Cloudinary
//   const uploadResults = [];
//   const errors = [];

//   for (const file of files) {
//     try {
//       // Validate file type
//       if (!file.mimetype.startsWith('image')) {
//         errors.push(`File ${file.name} is not an image`);
//         continue;
//       }

//       // Validate file size (limit to 5MB)
//       if (file.size > 5 * 1024 * 1024) {
//         errors.push(`File ${file.name} exceeds 5MB limit`);
//         continue;
//       }

//       // Generate unique public ID
//       const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//       const originalName = file.name.replace(/\.[^/.]+$/, '');
//       const publicId = `properties/${customer._id}/${originalName}-${uniqueSuffix}`.replace(/\s+/g, '_');

//       // Upload to Cloudinary
//       const result = await cloudinary.uploader.upload(file.tempFilePath, {
//         folder: 'property_images',
//         public_id: publicId,
//         overwrite: false,
//         resource_type: 'image',
//         quality: 'auto:good'
//       });

//       uploadResults.push(result);
//     } catch (err) {
//       errors.push(`Failed to upload ${file.name}: ${err.message}`);
//       console.error(`Upload error for ${file.name}:`, err);
//     }
//   }

//   // 6. Check if any uploads succeeded
//   if (uploadResults.length === 0) {
//     return next(new ErrorResponse(
//       errors.length > 0 ? errors.join('; ') : 'No files were successfully uploaded',
//       400
//     ));
//   }

//   // 7. Create image documents
//   const newImages = uploadResults.map(result => ({
//     url: result.secure_url,
//     publicId: result.public_id,
//     createdAt: new Date(),
//     width: result.width,
//     height: result.height,
//     format: result.format
//   }));

//   // 8. Add images to property
//   property.images.push(...newImages);
//   customer.markModified('propertyDetails');

//   // 9. Save with validation
//   try {
//     await customer.validate(); // Explicit validation
//     await customer.save();
//   } catch (err) {
//     // Clean up successful uploads if save fails
//     await Promise.all(
//       uploadResults.map(result => 
//         cloudinary.uploader.destroy(result.public_id).catch(console.error)
//     ));
    
//     console.error('Database save error:', err);
//     return next(new ErrorResponse(
//       `Failed to save image data to database: ${err.message}`,
//       500
//     ));
//   }

//   // 10. Return success response
//   res.status(200).json({
//     success: true,
//     count: newImages.length,
//     data: newImages,
//     warnings: errors.length > 0 ? errors : undefined
//   });
// });



exports.deletePropertyImage = asyncHandler(async (req, res, next) => {
  try {
    const { id, propertyIndex, imageId } = req.params;

    // 1. Find the customer
    const customer = await Customer.findById(id);
    if (!customer) {
      return next(new ErrorResponse('Customer not found', 404));
    }

    // 2. Validate property index
    const propIndex = parseInt(propertyIndex);
    if (isNaN(propIndex)) {
      return next(new ErrorResponse('Invalid property index', 400));
    }

    // 3. Find the image to delete
    const property = customer.propertyDetails[propIndex];
    if (!property) {
      return next(new ErrorResponse('Property not found', 404));
    }

    const imageIndex = property.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      return next(new ErrorResponse('Image not found', 404));
    }

    const imageToDelete = property.images[imageIndex];

    // 4. Delete from Cloudinary
    await cloudinary.uploader.destroy(imageToDelete.publicId);

    // 5. Remove from database
    const updateQuery = {
      $pull: {
        [`propertyDetails.${propIndex}.images`]: { _id: imageId }
      }
    };

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      updateQuery,
      { new: true }
    );

    if (!updatedCustomer) {
      throw new Error('Failed to update customer after image deletion');
    }

    // 6. Return success response
    res.status(200).json({
      success: true,
      data: updatedCustomer.propertyDetails[propIndex].images
    });

  } catch (err) {
    console.error('Delete image error:', err);
    return next(
      new ErrorResponse(err.message || 'Failed to delete image', err.statusCode || 500)
    );
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
        street: address?.street,
        city: address?.city,
        state: address?.state,
        zipCode: address?.zipCode,
        country: address?.country
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

  // Check if the customer belongs to the tenant (for tenant admins)
  if (req.user.role === 'tenantAdmin' && !customer.tenants.includes(req.user.tenantId)) {
    return next(
      new ErrorResponse(`Not authorized to delete this customer`, 403)
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