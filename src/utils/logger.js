/**
 * Logger Utility
 * Provides structured logging using Winston.
 * Logs are formatted as JSON in production and colorized in development.
 */

const winston = require('winston');

const { combine, timestamp, json, colorize, simple, errors } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Create the Winston logger instance.
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    isProduction ? json() : combine(colorize(), simple())
  ),
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test',
    }),
  ],
  exitOnError: false,
});

// Add file transport in production
if (isProduction) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    })
  );
}

module.exports = logger;
