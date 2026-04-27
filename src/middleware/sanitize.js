/**
 * Request Sanitization Middleware
 *
 * Strips potentially dangerous characters from request inputs to prevent
 * XSS and injection attacks. Works in conjunction with Joi validation.
 *
 * Note: Prisma uses parameterized queries, so SQL injection is already
 * mitigated at the ORM level. This middleware adds defense-in-depth.
 */

'use strict';

const logger = require('../utils/logger');

// Characters/patterns to strip from string values
const DANGEROUS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,  // <script> tags
  /javascript:/gi,                           // javascript: protocol
  /on\w+\s*=/gi,                             // inline event handlers (onclick=, etc.)
  /<iframe[\s\S]*?>/gi,                      // iframes
  /<object[\s\S]*?>/gi,                      // objects
  /<embed[\s\S]*?>/gi,                       // embeds
];

/**
 * Recursively sanitize a value.
 * @param {*} value
 * @returns {*} Sanitized value
 */
const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    let sanitized = value.trim();
    for (const pattern of DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    return sanitized;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value);
  }
  return value;
};

/**
 * Recursively sanitize all string values in an object.
 * @param {object} obj
 * @returns {object} Sanitized object
 */
const sanitizeObject = (obj) => {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = sanitizeValue(val);
  }
  return result;
};

/**
 * Express middleware that sanitizes req.body, req.query, and req.params.
 */
const sanitizeRequest = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    // Note: req.params are URL-decoded by Express; sanitize for safety
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    next();
  } catch (err) {
    logger.error('Sanitization error', { error: err.message });
    next(); // don't block the request on sanitization failure
  }
};

module.exports = { sanitizeRequest, sanitizeValue, sanitizeObject };
