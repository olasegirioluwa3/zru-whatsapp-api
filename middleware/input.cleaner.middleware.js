const { validationResult, check, sanitize } = require('express-validator');

// Validation rules for user input
const validationRules = [
  // Example rule: Check if 'email' is an email
  check('email').isEmail().normalizeEmail(),

  // Add more rules as needed for other fields
  // Example: check('fieldName').isString().trim().escape(),
];

// Utility function to validate and sanitize input
const validateAndSanitize = (req, res, next) => {
  // Apply validation rules to req.body
  validationRules.forEach((rule) => rule.run(req));

  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'failed', message: 'Validation error', errors: errors.array() });
  }

  // Sanitize req.body
  sanitizeBody(req);

  // Apply validation rules to req.params (if needed)
  // Example: validationRules.forEach((rule) => rule.run(req.params));

  // Check for validation errors in req.params (if needed)
  // Example: const paramErrors = validationResult(req);
  // Example: if (!paramErrors.isEmpty()) return res.status(400).json({ status: 'failed', message: 'Validation error', errors: paramErrors.array() });

  next();
};

// Sanitize req.body
const sanitizeBody = (req) => {
  // req.body = validationResult(req).sanitize();
  req.body = validationResult(req).array();

};

// Sanitize request data recursively
const sanitizeRequestData = (data) => {
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeRequestData(item));
  } else if (typeof data === 'object' && data !== null) {
    const sanitizedData = {};
    for (const key in data) {
      if (Object.hasOwnProperty.call(data, key)) {
        sanitizedData[key] = sanitizeRequestData(data[key]);
      }
    }
    return sanitizedData;
  } else {
    return sanitize(data);
  }
};

module.exports = validateAndSanitize;
