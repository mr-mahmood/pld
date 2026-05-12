// components/CustomToast.tsx
'use client';

import { useEffect, useState } from 'react';
import './ToastStyles.css';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  position: ToastPosition;
  duration: number;
  isExiting: boolean;
}

type ToastType = 
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'cyan'
  | 'orange'
  | 'see-blue'
  | 'purple'
  | 'dark-orange';

type ToastPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';

interface ToastOptions {
  position?: ToastPosition;
  duration?: number;
}

interface ToastFunctions {
  primary: (message: string, options?: ToastOptions) => void;
  secondary: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  danger: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  cyan: (message: string, options?: ToastOptions) => void;
  orange: (message: string, options?: ToastOptions) => void;
  seeBlue: (message: string, options?: ToastOptions) => void;
  purple: (message: string, options?: ToastOptions) => void;
  darkOrange: (message: string, options?: ToastOptions) => void;
  custom: (message: string, type: string, options?: ToastOptions) => void;
}

let toastFunctions: ToastFunctions | null = null;

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: number) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id ? { ...toast, isExiting: true } : toast
      )
    );
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 300);
  };

  const addToast = (message: string, type: ToastType, options: ToastOptions = {}) => {
    const id = Date.now();
    const duration = options.duration || 3000;
    setToasts(prev => [...prev, {
      id,
      message,
      type,
      position: options.position || 'top-right',
      duration: duration,
      isExiting: false
    }]);
    
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  useEffect(() => {
    toastFunctions = {
      primary: (message: string, options?: ToastOptions) => addToast(message, 'primary', options),
      secondary: (message: string, options?: ToastOptions) => addToast(message, 'secondary', options),
      success: (message: string, options?: ToastOptions) => addToast(message, 'success', options),
      danger: (message: string, options?: ToastOptions) => addToast(message, 'danger', options),
      warning: (message: string, options?: ToastOptions) => addToast(message, 'warning', options),
      info: (message: string, options?: ToastOptions) => addToast(message, 'info', options),
      cyan: (message: string, options?: ToastOptions) => addToast(message, 'cyan', options),
      orange: (message: string, options?: ToastOptions) => addToast(message, 'orange', options),
      seeBlue: (message: string, options?: ToastOptions) => addToast(message, 'see-blue', options),
      purple: (message: string, options?: ToastOptions) => addToast(message, 'purple', options),
      darkOrange: (message: string, options?: ToastOptions) => addToast(message, 'dark-orange', options),
      custom: (message: string, type: string, options?: ToastOptions) => {
        const id = Date.now();
        const duration = options?.duration || 3000;
        setToasts(prev => [...prev, {
          id,
          message,
          type: type as ToastType,
          position: options?.position || 'top-right',
          duration: duration,
          isExiting: false
        }]);
        
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    };
  }, []);

  const toastsByPosition = toasts.reduce<Record<string, Toast[]>>((acc, toast) => {
    if (!acc[toast.position]) {
      acc[toast.position] = [];
    }
    acc[toast.position].push(toast);
    return acc;
  }, {});

  // Helper function to convert color names to CSS variable format
  const getColorVariable = (type: string): string => {
    // Handle see-blue special case
    if (type === 'see-blue') return 'see-blue';
    if (type === 'dark-orange') return 'dark-orange';
    return type;
  };

  return (
    <>
      {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
        <div key={position} className={`toastify-container toastify-${position}`}>
          {positionToasts.map(toast => (
            <div
              key={toast.id}
              className={`toastify on toastify-slide-in ${toast.isExiting ? 'fade-out' : ''}`}
              aria-live="polite"
              style={{
                background: `rgb(var(--${getColorVariable(toast.type)}), 1)`,
                transform: 'translate(0px, 0px)',
                top: '15px'
              }}
              onClick={() => removeToast(toast.id)}
            >
              <span className="toast-message">{toast.message}</span>
              {!toast.isExiting && (
                <div 
                  className="timer-bar" 
                  style={{
                    animationDuration: `${toast.duration}ms`
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
};

export const useToast = (): ToastFunctions => {
  return toastFunctions || {
    primary: () => console.warn('ToastContainer not mounted yet'),
    secondary: () => console.warn('ToastContainer not mounted yet'),
    success: () => console.warn('ToastContainer not mounted yet'),
    danger: () => console.warn('ToastContainer not mounted yet'),
    warning: () => console.warn('ToastContainer not mounted yet'),
    info: () => console.warn('ToastContainer not mounted yet'),
    cyan: () => console.warn('ToastContainer not mounted yet'),
    orange: () => console.warn('ToastContainer not mounted yet'),
    seeBlue: () => console.warn('ToastContainer not mounted yet'),
    purple: () => console.warn('ToastContainer not mounted yet'),
    darkOrange: () => console.warn('ToastContainer not mounted yet'),
    custom: () => console.warn('ToastContainer not mounted yet'),
  };
};

export default ToastContainer;