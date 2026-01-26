
type LogLevel = 'info' | 'warn' | 'error';

class Logger {
  private log(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    
    // In a production app, this would send to Sentry/Datadog
    // We filter sensitive data from meta if needed
    
    switch (level) {
      case 'error':
        console.error(`[${timestamp}] [ERROR] ${message}`, meta || '');
        break;
      case 'warn':
        console.warn(`[${timestamp}] [WARN] ${message}`, meta || '');
        break;
      case 'info':
        console.log(`[${timestamp}] [INFO] ${message}`, meta || '');
        break;
    }
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: any) {
    this.log('error', message, meta);
  }
}

export const logger = new Logger();
