const cloudinary = require('cloudinary').v2;

// Configure cloudinary
// Alternative direct configuration (not recommended for production)
cloudinary.config({ 
  cloud_name: 'dh1sgsaf5',
  api_key: '272766161431348',
  api_secret: 'MdyI6nEj8jed6lmWhnxDLjkevx4',
  secure: true
});

module.exports = cloudinary; 