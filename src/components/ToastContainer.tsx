'use client';

import { useEffect } from 'react';
import { useToastStore, type Toast } from '@/lib/toast-notifications';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast Container Component
 * Displays all active toasts in the UI
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

/**
 * Custom Icons for Toasts
 */
function SuccessIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 20h20L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Individual Toast Item
 */
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(onClose, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onClose]);

  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-slate-900 border-slate-700',
          icon: <SuccessIcon />,
          iconColor: 'text-emerald-400',
        };
      case 'error':
        return {
          bg: 'bg-slate-900 border-slate-700',
          icon: <ErrorIcon />,
          iconColor: 'text-red-400',
        };
      case 'warning':
        return {
          bg: 'bg-slate-900 border-slate-700',
          icon: <WarningIcon />,
          iconColor: 'text-amber-400',
        };
      case 'info':
      default:
        return {
          bg: 'bg-slate-900 border-slate-700',
          icon: <InfoIcon />,
          iconColor: 'text-blue-400',
        };
    }
  };

  const styles = getToastStyles(toast.type);

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg animate-in fade-in slide-in-from-right-2 duration-300 max-w-sm',
        styles.bg
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 mt-0.5', styles.iconColor)}>
        {styles.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-white">{toast.title}</p>
        <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>

        {/* Action Button */}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onClose();
            }}
            className="mt-2 text-xs font-medium text-white hover:text-slate-100 opacity-80 hover:opacity-100 transition-opacity"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="flex-shrink-0 text-slate-500 hover:text-white transition-colors mt-0.5"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
