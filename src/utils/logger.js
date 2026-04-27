/**
 * Logger Utility
 * Winston-based structured logging with environment-aware configuration
 */

'use strict';

const winston = require('winston');

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Custom log format for development (colorized, readable)
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

/**
 * Custom log format for production (JSON, structured)
 * Excludes sensitive fields
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Winston logger instance
 */
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'krizot-api' },
  transports: [
    new winston.transports.Console({
      silent: NODE_ENV === 'test', // Suppress logs during testing
    }),
  ],
});

// Add file transport in production
if (NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true,
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    tailable: true,
  }));
}

module.exports = logger;
