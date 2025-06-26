const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: function() {
      return this.role !== 'superAdmin';
    }
  },
  role: {
    type: String,
    enum: ['superAdmin', 'tenantAdmin', 'staff', 'customer'],
    default: 'customer'
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    maxlength: [20, 'Phone number cannot be longer than 20 characters']
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  needsPasswordReset: {
    type: Boolean,
    default: false
  },
  passwordSetupToken: String,
  passwordSetupExpire: Date,
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  isPasswordSet: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  const payload = {
    id: this._id,
    role: this.role
  };

  // Add tenantId to payload if it exists (i.e., for non-SuperAdmin users)
  if (this.tenantId) {
    payload.tenantId = this.tenantId;
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Generate email verification token
UserSchema.methods.getEmailVerificationToken = function() {
  // Generate token
  const verificationToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Set expire
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;

  return verificationToken;
};



// Generate password setup token
UserSchema.methods.getPasswordSetupToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to field
  this.passwordSetupToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (24 hours)
  this.passwordSetupExpire = Date.now() + 24 * 60 * 60 * 1000;

  return resetToken;
};




module.exports = mongoose.model('User', UserSchema); 