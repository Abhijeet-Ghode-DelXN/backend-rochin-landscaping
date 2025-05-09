const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middlewares/error');
const fileUpload = require('express-fileupload');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize app
const app = express();

// Body parser
app.use(express.json());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Security middleware
app.use(helmet());
// app.use(cors());
app.use(cors({
  origin: function (origin, callback) {
    // You can validate dynamic origins here (e.g., from DB)
    callback(null, true);
  },
  credentials: true
}));

// Add this before your routes
app.use(fileUpload({
  createParentPath: true, // Creates upload directory if not exists
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  abortOnLimit: true, // Return 413 when file too large
}));
// API version
const API_PREFIX = '/api/v1';

// Route files
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const appointmentRoutes = require('./src/routes/appointment.routes');
const estimateRoutes = require('./src/routes/estimate.routes');
const serviceRoutes = require('./src/routes/service.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const customerRoutes = require('./src/routes/customer.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const professionalRoutes = require('./src/routes/professional.routes');
const reportRoutes = require('./src/routes/report.routes');
const businessSettingRoutes = require('./src/routes/business-setting.routes');

// Mount routers
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/appointments`, appointmentRoutes);
app.use(`${API_PREFIX}/estimates`, estimateRoutes);
app.use(`${API_PREFIX}/services`, serviceRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/professionals`, professionalRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/business-settings`, businessSettingRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Landscaping Service Management API',
    apiDocumentation: `${req.protocol}://${req.get('host')}${API_PREFIX}/docs`,
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
}); 