const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');

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









// @desc    Create customer profile
// @route   POST /api/v1/customers
// @access  Private/Admin
exports.createCustomer = asyncHandler(async (req, res, next) => {
  // Check if customer already exists
  const existingCustomer = await Customer.findOne({ user: req.body.user });

  if (existingCustomer) {
    return next(
      new ErrorResponse(`Customer profile already exists for this user`, 400)
    );
  }

  // Verify user exists
  const user = await User.findById(req.body.user);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.body.user}`, 404)
    );
  }

  // Create customer
  const customer = await Customer.create(req.body);

  res.status(201).json({
    success: true,
    data: customer
  });
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