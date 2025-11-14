'use client';

import { useEffect } from 'react';
import { useToastStore, type Toast } from '@/lib/toast-notifications';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toast Container Component
 * Displays all active toasts in the UI
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
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
          bg: 'bg-emerald-900/95 border-emerald-700',
          icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
          title: 'text-emerald-100',
          message: 'text-emerald-200',
        };
      case 'error':
        return {
          bg: 'bg-red-900/95 border-red-700',
          icon: <XCircle className="w-5 h-5 text-red-400" />,
          title: 'text-red-100',
          message: 'text-red-200',
        };
      case 'warning':
        return {
          bg: 'bg-amber-900/95 border-amber-700',
          icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
          title: 'text-amber-100',
          message: 'text-amber-200',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-900/95 border-blue-700',
          icon: <Info className="w-5 h-5 text-blue-400" />,
          title: 'text-blue-100',
          message: 'text-blue-200',
        };
    }
  };

  const styles = getToastStyles(toast.type);

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg animate-in fade-in slide-in-from-right-2 duration-300',
        styles.bg
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold text-sm', styles.title)}>{toast.title}</p>
        <p className={cn('text-xs mt-0.5', styles.message)}>{toast.message}</p>

        {/* Action Button */}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onClose();
            }}
            className="mt-2 text-xs font-medium hover:underline opacity-80 hover:opacity-100 transition-opacity"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors mt-0.5"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
