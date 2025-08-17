// This middleware is not needed since express-fileupload is already configured globally in server.js
// The express-fileupload middleware is already set up in server.js with all necessary configurations

// For property routes, we'll handle file uploads directly in the controller
// since express-fileupload automatically processes uploaded files

module.exports = {
  // This is a placeholder - actual file handling is done in the controller
  // express-fileupload automatically processes files and makes them available in req.files
};
