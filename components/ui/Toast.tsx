
import React from 'react';
import { useError } from '../../contexts/ErrorContext';

export const ToastContainer: React.FC = () => {
  const { errors, removeError } = useError();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {errors.map((error) => (
        <div 
          key={error.id} 
          className={`
            pointer-events-auto w-80 bg-white border-l-4 rounded shadow-lg p-4 transform transition-all duration-300 animate-in slide-in-from-right
            ${error.type === 'error' ? 'border-red-500' : error.type === 'success' ? 'border-green-500' : error.type === 'warning' ? 'border-yellow-500' : 'border-blue-500'}
          `}
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className={`text-sm font-bold ${
                error.type === 'error' ? 'text-red-800' : error.type === 'success' ? 'text-green-800' : 'text-slate-800'
              }`}>
                {error.title}
              </h4>
              <p className="text-sm text-slate-600 mt-1">{error.message}</p>
            </div>
            <button 
              onClick={() => removeError(error.id)}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
