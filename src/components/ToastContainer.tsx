'use client';

import { useEffect, useState, useRef } from 'react';
import { useToastStore, type Toast } from '@/lib/toast-notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle2,
    accent: '#36e27b',
    glow: 'rgba(54, 226, 123, 0.08)',
    border: 'rgba(54, 226, 123, 0.25)',
    iconBg: 'rgba(54, 226, 123, 0.12)',
  },
  error: {
    icon: XCircle,
    accent: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.25)',
    iconBg: 'rgba(239, 68, 68, 0.12)',
  },
  warning: {
    icon: AlertTriangle,
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.25)',
    iconBg: 'rgba(245, 158, 11, 0.12)',
  },
  info: {
    icon: Info,
    accent: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.25)',
    iconBg: 'rgba(99, 102, 241, 0.12)',
  },
};

/**
 * Toast Container — renders all active toasts with stacking
 */
export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 380 }}>
      <AnimatePresence mode="popLayout">
        {toasts.map((t, i) => (
          <ToastItem
            key={t.id}
            toast={t}
            index={i}
            onDismiss={() => dismissToast(t.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Individual toast with progress bar, icon, animations
 */
function ToastItem({ toast, index, onDismiss }: { toast: Toast; index: number; onDismiss: () => void }) {
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = config.icon;
  const isDismissing = !!toast.dismissedAt;

  // Progress bar
  const [progress, setProgress] = useState(100);
  const startRef = useRef(toast.timestamp);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (toast.duration <= 0 || isDismissing) return;
    startRef.current = toast.timestamp;

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [toast.duration, toast.timestamp, isDismissing]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9, filter: 'blur(4px)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="pointer-events-auto relative overflow-hidden rounded-xl"
      style={{
        background: 'rgba(12, 12, 14, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${config.border}`,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 8px 32px -8px rgba(0,0,0,0.6), 0 0 20px ${config.glow}`,
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: config.accent }}
      />

      <div className="flex items-start gap-3 pl-4 pr-3 py-3">
        {/* Icon */}
        <div
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
          style={{ background: config.iconBg }}
        >
          <Icon size={16} style={{ color: config.accent }} strokeWidth={2.5} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          <p className="text-[13px] font-semibold text-zinc-100 leading-tight truncate">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
              {toast.message}
            </p>
          )}
          {toast.action && (
            <button
              onClick={() => { toast.action?.onClick(); onDismiss(); }}
              className="mt-2 text-[11px] font-semibold transition-colors hover:brightness-125"
              style={{ color: config.accent }}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors mt-0.5"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${config.accent}44, ${config.accent})`,
              width: `${progress}%`,
            }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  );
}
