
import React, { createContext, useContext, useState, useCallback } from 'react';
import { normalizeError } from '../services/errors';
import { logger } from '../services/logger';

interface ErrorMessage {
  id: string;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
}

interface ErrorContextType {
  errors: ErrorMessage[];
  addError: (error: unknown, customMessage?: string) => void;
  addToast: (title: string, message: string, type?: 'error' | 'warning' | 'info' | 'success') => void;
  removeError: (id: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  const removeError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addToast = useCallback((title: string, message: string, type: 'error' | 'warning' | 'info' | 'success' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2);
    setErrors((prev) => [...prev, { id, title, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      removeError(id);
    }, 5000);
  }, [removeError]);

  const addError = useCallback((rawError: unknown, contextMessage?: string) => {
    // 1. Normalize
    const error = normalizeError(rawError);
    
    // 2. Log centrally
    logger.error(error.message, { 
      type: error.type, 
      original: error.originalError, 
      context: contextMessage 
    });

    // 3. Map to UI Message
    let title = "Error";
    let message = contextMessage || error.message;
    let type: 'error' | 'warning' = 'error';

    switch (error.type) {
      case 'AUTH':
        title = "Authentication Failed";
        // User friendly message for auth errors
        if (!contextMessage) message = "Your session has expired or is invalid. Please reconnect.";
        break;
      case 'API':
        title = "Connection Issue";
        break;
      case 'NETWORK':
        title = "Network Error";
        message = "Please check your internet connection.";
        break;
      case 'GENERAL':
      default:
        title = "Unexpected Error";
        break;
    }

    // Append detail if context provided but different from error
    if (contextMessage && error.message && error.message !== contextMessage && error.message !== "An unexpected error occurred") {
       message = `${contextMessage}: ${error.message}`;
    }

    addToast(title, message, type);
  }, [addToast, removeError]);

  return (
    <ErrorContext.Provider value={{ errors, addError, addToast, removeError }}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};
