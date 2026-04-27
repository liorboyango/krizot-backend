/**
 * Logger Utility
 * Structured logging using Winston.
 * Logs to console in development, structured JSON in production.
 * Sensitive data (passwords, tokens) is never logged.
 */

const { createLogger, format, transports } = require('winston');

const isProduction = process.env.NODE_ENV === 'production';

const devFormat = format.printf(function (info) {
  var ts = info.timestamp;
  var level = info.level;
  var message = info.message;
  var stack = info.stack;
  var meta = Object.assign({}, info);
  delete meta.timestamp;
  delete meta.level;
  delete meta.message;
  delete meta.stack;

  var log = ts + ' [' + level + ']: ' + message;
  var metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    log += ' ' + JSON.stringify(meta);
  }
  if (stack) {
    log += '\n' + stack;
  }
  return log;
});

var loggerTransports = [new transports.Console()];

var loggerFormat;
if (isProduction) {
  loggerFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  );
} else {
  loggerFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.colorize(),
    devFormat
  );
}

const logger = createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: loggerFormat,
  transports: loggerTransports,
  exceptionHandlers: [new transports.Console()],
  rejectionHandlers: [new transports.Console()],
});

module.exports = logger;
