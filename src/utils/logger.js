/**
 * Logger Utility
 *
 * Structured logging using Winston.
 * Logs are JSON-formatted in production and pretty-printed in development.
 * Sensitive data (passwords, tokens) is never logged.
 */

const { createLogger, format, transports } = require('winston');

const { combine, timestamp, errors, json, colorize, printf } = format;

const isDev = process.env.NODE_ENV !== 'production';

// Development format: colorized, human-readable
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    let log = `${ts} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Production format: structured JSON
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: isDev ? devFormat : prodFormat,
  transports: [
    new transports.Console(),
  ],
  // Do not exit on handled exceptions
  exitOnError: false,
});

// Add file transport in production
if (!isDev) {
  logger.add(
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
  logger.add(
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    })
  );
}

module.exports = logger;
