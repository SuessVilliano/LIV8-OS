
export class AppError extends Error {
  public type: 'AUTH' | 'API' | 'NETWORK' | 'GENERAL';
  public originalError?: any;

  constructor(message: string, type: 'AUTH' | 'API' | 'NETWORK' | 'GENERAL' = 'GENERAL', originalError?: any) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.originalError = originalError;
  }
}

export class AuthError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 'AUTH', originalError);
    this.name = 'AuthError';
  }
}

export class ApiError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 'API', originalError);
    this.name = 'ApiError';
  }
}

/**
 * Converts any unknown error value into a standardized AppError.
 */
export const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, 'GENERAL', error);
  }

  if (typeof error === 'string') {
    return new AppError(error, 'GENERAL');
  }

  return new AppError('An unexpected error occurred', 'GENERAL', error);
};
