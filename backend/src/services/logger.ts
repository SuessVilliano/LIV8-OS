/**
 * Structured Logger for LIV8 OS
 *
 * Structured JSON logs for production observability.
 * Supports log levels, request context, and metadata.
 * Pretty prints in development, JSON in production.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  agencyId?: string;
  locationId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatLog(level: LogLevel, message: string, context?: LogContext | any[], error?: Error): void {
  if (process.env.NODE_ENV === 'production') {
    // Structured JSON for production log aggregators
    const entry: any = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    if (context && !Array.isArray(context)) {
      Object.assign(entry, context);
    }
    if (error) {
      entry.error = { name: error.name, message: error.message };
    }

    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  } else {
    // Pretty format for development
    const time = new Date().toISOString().substring(11, 23);
    const prefix = `[${time}] [${level.toUpperCase()}]`;

    if (level === 'error') {
      if (Array.isArray(context)) {
        console.error(prefix, message, ...context);
      } else {
        console.error(prefix, message, ...(context ? [context] : []), ...(error ? [error.message] : []));
      }
    } else if (level === 'warn') {
      if (Array.isArray(context)) {
        console.warn(prefix, message, ...context);
      } else {
        console.warn(prefix, message, ...(context ? [context] : []));
      }
    } else {
      if (Array.isArray(context)) {
        console.log(prefix, message, ...context);
      } else {
        console.log(prefix, message, ...(context ? [context] : []));
      }
    }
  }
}

/**
 * Main logger - backwards compatible with existing code that uses logger.info(msg, ...args)
 * Also supports structured context: logger.info(msg, { userId, route })
 */
export const logger = {
  info: (message: string, ...args: any[]) => {
    if (!shouldLog('info')) return;
    if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      formatLog('info', message, args[0] as LogContext);
    } else if (args.length > 0) {
      formatLog('info', message, args);
    } else {
      formatLog('info', message);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (!shouldLog('warn')) return;
    if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      formatLog('warn', message, args[0] as LogContext);
    } else if (args.length > 0) {
      formatLog('warn', message, args);
    } else {
      formatLog('warn', message);
    }
  },
  error: (message: string, ...args: any[]) => {
    if (!shouldLog('error')) return;
    const err = args.find(a => a instanceof Error);
    const ctx = args.find(a => typeof a === 'object' && !(a instanceof Error) && !Array.isArray(a));
    if (err || ctx) {
      formatLog('error', message, ctx as LogContext, err);
    } else if (args.length > 0) {
      formatLog('error', message, args);
    } else {
      formatLog('error', message);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (!shouldLog('debug')) return;
    if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      formatLog('debug', message, args[0] as LogContext);
    } else if (args.length > 0) {
      formatLog('debug', message, args);
    } else {
      formatLog('debug', message);
    }
  }
};

/**
 * Express request logging middleware
 * Logs every request with method, path, status, duration
 */
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    req.requestId = requestId;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const context: LogContext = {
        requestId,
        method: req.method,
        route: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        userId: req.user?.userId
      };

      if (res.statusCode >= 500) {
        logger.error(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, context);
      } else if (res.statusCode >= 400) {
        logger.warn(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, context);
      } else if (duration > 5000) {
        logger.warn(`Slow: ${req.method} ${req.originalUrl} ${duration}ms`, context);
      }
      // Don't log every successful request in production to reduce noise
    });

    next();
  };
}

export type { LogContext, LogLevel };
