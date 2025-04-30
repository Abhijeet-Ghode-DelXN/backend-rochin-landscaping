# Landscaping Service Management API

A complete backend solution for landscaping service businesses to manage appointments, estimates, services, customers, and payments.

## Features

- **Authentication & User Management**
  - Roles: Admin, Landscaping Professional, Customer
  - JWT-based authentication
  - Email verification and password reset
  - Role-based route protection

- **Appointment & Calendar Management**
  - Schedule and manage appointments
  - Recurring appointment options
  - Color-coded calendar endpoints
  - Service history tracking

- **Estimate Requests & Management**
  - Customer estimate requests with photo uploads
  - Multi-package estimates (Basic, Standard, Premium)
  - Estimate approval and deposit payments

- **Services Management**
  - Service catalog with packages
  - Pricing and duration management
  - Recurring service options

- **Payment Integration**
  - Stripe integration for payments
  - Receipt generation
  - Refund processing
  - Payment history tracking

- **Customer Management**
  - Customer profiles and property details
  - Service preferences and history
  - Notification preferences

- **Photo Uploads**
  - Before and after service photos
  - Cloudinary integration for image storage
  - Photo metadata support

## Tech Stack

- Node.js with Express
- MongoDB with Mongoose
- JWT Authentication
- Stripe for payments
- Cloudinary for image storage
- SendGrid for email notifications

## Setup & Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/landscaping-api.git
cd landscaping-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment Variables**

Create a `.env` file in the project root with the following variables:

```
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your_email
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=noreply@landscapingservice.com
STRIPE_SECRET_KEY=your_stripe_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
MAX_FILE_UPLOAD=1000000
FILE_UPLOAD_PATH=./public/uploads
```

4. **Database Seeding**

To seed the database with sample data:

```bash
# Import data
npm run seed -- -i

# Delete data
npm run seed -- -d
```

5. **Start the server**

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Documentation

### Authentication Routes

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login and get token
- `GET /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/updatedetails` - Update user details
- `PUT /api/v1/auth/updatepassword` - Update password
- `POST /api/v1/auth/forgotpassword` - Password reset request
- `PUT /api/v1/auth/resetpassword/:resettoken` - Reset password
- `GET /api/v1/auth/verify-email/:verificationtoken` - Verify email

### User Routes (Admin Only)

- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:id` - Get single user
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Customer Routes

- `GET /api/v1/customers` - Get all customers (Admin)
- `GET /api/v1/customers/:id` - Get single customer (Admin)
- `POST /api/v1/customers` - Create customer (Admin)
- `PUT /api/v1/customers/:id` - Update customer (Admin)
- `DELETE /api/v1/customers/:id` - Delete customer (Admin)
- `GET /api/v1/customers/me` - Get current customer profile (Customer)
- `PUT /api/v1/customers/me` - Update customer profile (Customer)
- `GET /api/v1/customers/me/history` - Get service history (Customer)
- `GET /api/v1/customers/:id/history` - Get customer history (Admin)

### Service Routes

- `GET /api/v1/services` - Get all services
- `GET /api/v1/services/:id` - Get single service
- `POST /api/v1/services` - Create service (Admin)
- `PUT /api/v1/services/:id` - Update service (Admin)
- `DELETE /api/v1/services/:id` - Delete service (Admin)
- `PUT /api/v1/services/:id/photo` - Upload service photo (Admin)
- `GET /api/v1/services/category/:category` - Get services by category
- `GET /api/v1/services/:id/packages` - Get service packages

### Appointment Routes

- `GET /api/v1/appointments` - Get all appointments (Admin/Professional)
- `GET /api/v1/appointments/:id` - Get single appointment
- `POST /api/v1/appointments` - Create appointment (Admin)
- `PUT /api/v1/appointments/:id` - Update appointment (Admin/Professional)
- `DELETE /api/v1/appointments/:id` - Delete appointment (Admin)
- `POST /api/v1/appointments/:id/photos` - Upload service photos (Admin/Professional)
- `GET /api/v1/appointments/my-appointments` - Get my appointments (Customer)
- `PUT /api/v1/appointments/:id/reschedule-request` - Request reschedule (Customer)
- `GET /api/v1/appointments/calendar` - Get calendar appointments

### Estimate Routes

- `GET /api/v1/estimates` - Get all estimates (Admin/Professional)
- `GET /api/v1/estimates/:id` - Get single estimate
- `POST /api/v1/estimates` - Create estimate (Admin)
- `PUT /api/v1/estimates/:id` - Update estimate (Admin)
- `DELETE /api/v1/estimates/:id` - Delete estimate (Admin)
- `POST /api/v1/estimates/:id/photos` - Upload estimate photos
- `POST /api/v1/estimates/request` - Request estimate (Customer)
- `GET /api/v1/estimates/my-estimates` - Get my estimates (Customer)
- `PUT /api/v1/estimates/:id/approve` - Approve estimate package (Customer)

### Payment Routes

- `GET /api/v1/payments` - Get all payments (Admin)
- `GET /api/v1/payments/:id` - Get single payment
- `POST /api/v1/payments/process` - Process payment with Stripe
- `POST /api/v1/payments/manual` - Create manual payment (Admin)
- `GET /api/v1/payments/:id/receipt` - Get payment receipt
- `POST /api/v1/payments/:id/refund` - Process refund (Admin)
- `GET /api/v1/payments/my-payments` - Get my payments (Customer)

## License

MIT 