const { check } = require('express-validator');

exports.createGalleryValidation = [
  check('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 100 })
    .withMessage('Title cannot be more than 100 characters'),
  
  check('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 1000 })
    .withMessage('Description cannot be more than 1000 characters'),
  
  check('location')
    .notEmpty()
    .withMessage('Location is required'),
  
  check('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['residential', 'commercial', 'event', 'landscaping', 'garden', 'other'])
    .withMessage('Invalid category'),
  
  check('projectDate')
    .notEmpty()
    .withMessage('Project date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  
  check('clientName')
    .optional()
    .trim(),
  
  check('projectDuration')
    .optional()
    .trim(),
  
  check('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string'),
  
  check('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status')
];

exports.updateGalleryValidation = [
  check('title')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Title cannot be more than 100 characters'),
  
  check('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot be more than 1000 characters'),
  
  check('category')
    .optional()
    .isIn(['residential', 'commercial', 'event', 'landscaping', 'garden', 'other'])
    .withMessage('Invalid category'),
  
  check('projectDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  
  check('clientName')
    .optional()
    .trim(),
  
  check('projectDuration')
    .optional()
    .trim(),
  
  check('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string'),
  
  check('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status')
]; 