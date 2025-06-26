const asyncHandler = require('../middlewares/async');
const Appointment = require('../models/appointment.model');
const Estimate = require('../models/estimate.model');
const Payment = require('../models/payment.model');
const Customer = require('../models/customer.model');
const Service = require('../models/service.model');
const User = require('../models/user.model');

// @desc    Get dashboard stats
// @route   GET /api/v1/dashboard
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  // Get counts
  const appointmentCount = await Appointment.countDocuments();
  const estimateCount = await Estimate.countDocuments();
  const customerCount = await Customer.countDocuments();
  const serviceCount = await Service.countDocuments();
  const paymentCount = await Payment.countDocuments();
  const userCount = await User.countDocuments();
  const professionalCount = await User.countDocuments({ role: 'professional' });

  // Get upcoming appointments (next 7 days)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const upcomingAppointments = await Appointment.find({
    scheduledDate: { $gte: today, $lte: nextWeek }
  })
    .sort({ scheduledDate: 1 })
    .populate('customer', 'name')
    .populate('service', 'name')
    .limit(5);

  // Get pending estimates
  const pendingEstimates = await Estimate.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .populate('customer', 'name')
    .limit(5);

  // Get recent payments
  const recentPayments = await Payment.find()
    .sort({ createdAt: -1 })
    .populate('customer', 'name')
    .limit(5);

  // Get monthly revenue - last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1); // Start of month
  
  const monthlyRevenue = await Payment.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: { 
          year: { $year: "$createdAt" }, 
          month: { $month: "$createdAt" } 
        },
        total: { $sum: "$amount" }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 }
    }
  ]);

  // Get service distribution
  const serviceDistribution = await Appointment.aggregate([
    {
      $lookup: {
        from: 'services',
        localField: 'service',
        foreignField: '_id',
        as: 'serviceInfo'
      }
    },
    {
      $unwind: '$serviceInfo'
    },
    {
      $group: {
        _id: '$serviceInfo.category',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      counts: {
        appointments: appointmentCount,
        estimates: estimateCount,
        customers: customerCount,
        services: serviceCount,
        payments: paymentCount,
        users: userCount,
        professionals: professionalCount
      },
      upcomingAppointments,
      pendingEstimates,
      recentPayments,
      monthlyRevenue,
      serviceDistribution
    }
  });
});

// // @desc    Get appointment analytics
// // @route   GET /api/v1/dashboard/appointments
// // @access  Private/Admin
// exports.getAppointmentAnalytics = asyncHandler(async (req, res, next) => {
//   // Get appointments by status
//   const appointmentsByStatus = await Appointment.aggregate([
//     {
//       $group: {
//         _id: '$status',
//         count: { $sum: 1 }
//       }
//     }
//   ]);

//   // Get appointments by day of week
//   const appointmentsByDayOfWeek = await Appointment.aggregate([
//     {
//       $group: {
//         _id: { $dayOfWeek: '$scheduledDate' },
//         count: { $sum: 1 }
//       }
//     },
//     {
//       $sort: { _id: 1 }
//     }
//   ]);

//   // Get appointment completion rate
//   const totalAppointments = await Appointment.countDocuments();
//   const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
//   const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

//   res.status(200).json({
//     success: true,
//     data: {
//       appointmentsByStatus,
//       appointmentsByDayOfWeek,
//       completionRate: Math.round(completionRate * 100) / 100
//     }
//   });
// });





// @desc    Get appointment analytics
// @route   GET /api/v1/dashboard/appointments
// @access  Private/Admin
exports.getAppointmentAnalytics = asyncHandler(async (req, res, next) => {
  // Get appointments by status
  const appointmentsByStatus = await Appointment.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get appointments by day of week
  const appointmentsByDayOfWeek = await Appointment.aggregate([
    {
      $group: {
        _id: { $dayOfWeek: '$date' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Get appointments by month
  const appointmentsByMonth = await Appointment.aggregate([
    {
      $group: {
        _id: { 
          year: { $year: "$date" },
          month: { $month: "$date" }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 }
    }
  ]);

  // Get appointment completion rate
  const totalAppointments = await Appointment.countDocuments();
  const completedAppointments = await Appointment.countDocuments({ status: 'Completed' });
  const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

  res.status(200).json({
    success: true,
    data: {
      appointmentsByStatus,
      appointmentsByDayOfWeek,
      appointmentsByMonth,
      completionRate: Math.round(completionRate * 100) / 100
    }
  });
});







// @desc    Get revenue analytics
// @route   GET /api/v1/dashboard/revenue
// @access  Private/Admin
exports.getRevenueAnalytics = asyncHandler(async (req, res, next) => {
  // Get total revenue
  const totalRevenue = await Payment.aggregate([
    {
      $match: { status: 'completed' }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  // Get revenue by service category
  const revenueByServiceCategory = await Payment.aggregate([
    {
      $match: { status: 'completed' }
    },
    {
      $lookup: {
        from: 'appointments',
        localField: 'appointment',
        foreignField: '_id',
        as: 'appointmentInfo'
      }
    },
    {
      $unwind: '$appointmentInfo'
    },
    {
      $lookup: {
        from: 'services',
        localField: 'appointmentInfo.service',
        foreignField: '_id',
        as: 'serviceInfo'
      }
    },
    {
      $unwind: '$serviceInfo'
    },
    {
      $group: {
        _id: '$serviceInfo.category',
        total: { $sum: '$amount' }
      }
    },
    {
      $sort: { total: -1 }
    }
  ]);

  // Get revenue by month (current year)
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  
  const revenueByMonth = await Payment.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfYear },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        total: { $sum: '$amount' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      revenueByServiceCategory,
      revenueByMonth
    }
  });
});





// @desc    Get customer analytics
// @route   GET /api/v1/dashboard/customers
// @access  Private/Admin
exports.getCustomerAnalytics = asyncHandler(async (req, res, next) => {
  // Customer growth by month
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  
  const customerGrowth = await Customer.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: { 
          year: { $year: "$createdAt" }, 
          month: { $month: "$createdAt" } 
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 }
    }
  ]);

  // Top customers by revenue
  const topCustomers = await Payment.aggregate([
    {
      $match: { status: 'completed' }
    },
    {
      $group: {
        _id: '$customer',
        totalSpent: { $sum: '$amount' },
        paymentCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalSpent: -1 }
    },
    {
      $limit: 10
    },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customerInfo'
      }
    },
    {
      $unwind: '$customerInfo'
    },
    {
      $lookup: {
        from: 'users',
        localField: 'customerInfo.user',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    {
      $unwind: '$userInfo'
    },
    {
      $project: {
        _id: 1,
        totalSpent: 1,
        paymentCount: 1,
        customerName: '$userInfo.name',
        email: '$userInfo.email',
        phone: '$userInfo.phone'
      }
    }
  ]);

  // Customer retention rate
  // Get customers who had appointments in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  // Customers with appointments in last 30 days
  const recentCustomers = await Appointment.distinct('customer', {
    scheduledDate: { $gte: thirtyDaysAgo }
  });
  
  // Customers with appointments between 30-60 days ago
  const previousPeriodCustomers = await Appointment.distinct('customer', {
    scheduledDate: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
  });
  
  // Count how many previous customers returned
  let returningCustomers = 0;
  for (const customerId of previousPeriodCustomers) {
    if (recentCustomers.includes(customerId)) {
      returningCustomers++;
    }
  }
  
  const retentionRate = previousPeriodCustomers.length > 0 
    ? (returningCustomers / previousPeriodCustomers.length) * 100
    : 0;

  res.status(200).json({
    success: true,
    data: {
      customerGrowth,
      topCustomers,
      retentionRate: Math.round(retentionRate * 100) / 100
    }
  });
}); 