const { check } = require('express-validator');

exports.createPortfolioValidation = [
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
  
  check('serviceType')
    .notEmpty()
    .withMessage('Service type is required')
    .isIn(['landscaping', 'garden-design', 'lawn-care', 'irrigation', 'hardscaping', 'maintenance', 'other'])
    .withMessage('Invalid service type'),
  
  check('projectDate')
    .notEmpty()
    .withMessage('Project date is required')
    .isISO8601()
    .withMessage('Invalid date format'),
  
  check('projectCost')
    .optional()
    .isNumeric()
    .withMessage('Project cost must be a number')
    .isFloat({ min: 0 })
    .withMessage('Project cost cannot be negative'),
  
  check('projectSize')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Project size cannot be more than 100 characters'),
  
  check('challenges')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Challenges cannot be more than 500 characters'),
  
  check('solutions')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Solutions cannot be more than 500 characters'),
  
  check('customerFeedback')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Customer feedback cannot be more than 500 characters'),
  
  check('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status')
];

exports.updatePortfolioValidation = [
  check('title')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Title cannot be more than 100 characters'),
  
  check('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot be more than 1000 characters'),
  
  check('serviceType')
    .optional()
    .isIn(['landscaping', 'garden-design', 'lawn-care', 'irrigation', 'hardscaping', 'maintenance', 'other'])
    .withMessage('Invalid service type'),
  
  check('projectDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  
  check('projectCost')
    .optional()
    .isNumeric()
    .withMessage('Project cost must be a number')
    .isFloat({ min: 0 })
    .withMessage('Project cost cannot be negative'),
  
  check('projectSize')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Project size cannot be more than 100 characters'),
  
  check('challenges')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Challenges cannot be more than 500 characters'),
  
  check('solutions')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Solutions cannot be more than 500 characters'),
  
  check('customerFeedback')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Customer feedback cannot be more than 500 characters'),
  
  check('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status')
]; 