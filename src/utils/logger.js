const isProduction = process.env.NODE_ENV === 'production';
const debugEnabled = process.env.REACT_APP_DEBUG_LOGS === 'true';

const sanitize = (arg) => {
  if (typeof arg === 'string') {
    // Redact JWT or long tokens
    const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/;
    if (jwtPattern.test(arg)) {
      return '[REDACTED]';
    }
    // Redact strings that look like bearer tokens
    if (arg.toLowerCase().includes('bearer')) {
      return arg.replace(/bearer\s+.+/i, 'Bearer [REDACTED]');
    }
  } else if (typeof arg === 'object' && arg !== null) {
    const clone = Array.isArray(arg) ? [] : {};
    Object.keys(arg).forEach(key => {
      if (/token/i.test(key)) {
        clone[key] = '[REDACTED]';
      } else {
        clone[key] = sanitize(arg[key]);
      }
    });
    return clone;
  }
  return arg;
};

const formatArgs = (args) => args.map(sanitize);

const logger = {
  debug: (...args) => {
    if (!isProduction && debugEnabled) {
      console.debug(...formatArgs(args));
    }
  },
  info: (...args) => {
    if (!isProduction && debugEnabled) {
      console.info(...formatArgs(args));
    }
  },
  warn: (...args) => {
    if (!isProduction && debugEnabled) {
      console.warn(...formatArgs(args));
    }
  },
  error: (...args) => {
    if (!isProduction) {
      console.error(...formatArgs(args));
    }
  }
};

export default logger;
