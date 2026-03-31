import { generateId } from "@/lib/utils";
/**
 * Custom toast notification system
 * Drop-in replacement for Sonner with premium UI
 */

import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  duration: number; // milliseconds, 0 = permanent
  dismissedAt?: number; // for exit animation timing
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'> & { id?: string }) => string;
  removeToast: (id: string) => void;
  dismissToast: (id: string) => void; // triggers exit animation first
  clearToasts: () => void;
}

const MAX_VISIBLE = 5;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = toast.id || generateId("t");
    const duration = toast.duration ?? 5000;

    const newToast: Toast = {
      ...toast,
      id,
      timestamp: Date.now(),
      duration,
    };

    set((state) => {
      // If id already exists, replace it (dedup)
      const exists = state.toasts.find(t => t.id === id);
      const updated = exists
        ? state.toasts.map(t => t.id === id ? newToast : t)
        : [...state.toasts, newToast];
      // Cap visible toasts
      const capped = updated.length > MAX_VISIBLE + 3
        ? updated.slice(updated.length - MAX_VISIBLE - 3)
        : updated;
      return { toasts: capped };
    });

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }

    return id;
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.map(t =>
        t.id === id ? { ...t, dismissedAt: Date.now() } : t
      ),
    }));
    // Remove after exit animation (400ms)
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id),
      }));
    }, 400);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// ─── Sonner-compatible API ──────────────────────────────────────────
// Usage: toast.success("Saved!") or toast.error("Failed", { description: "..." })

interface ToastOptions {
  id?: string;
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

function createToast(type: Toast['type'], titleOrMsg: string, opts?: ToastOptions): string {
  return useToastStore.getState().addToast({
    id: opts?.id,
    type,
    title: titleOrMsg,
    message: opts?.description || '',
    duration: opts?.duration ?? (type === 'error' ? 6000 : 4000),
    action: opts?.action,
  });
}

/**
 * Drop-in replacement for Sonner's toast() API.
 * Supports: toast.success("msg"), toast.error("msg", { description }), etc.
 */
export const toast = Object.assign(
  // toast("message") — defaults to info
  (msg: string, opts?: ToastOptions) => createToast('info', msg, opts),
  {
    success: (msg: string, opts?: ToastOptions) => createToast('success', msg, opts),
    error: (msg: string, opts?: ToastOptions) => createToast('error', msg, opts),
    warning: (msg: string, opts?: ToastOptions) => createToast('warning', msg, opts),
    info: (msg: string, opts?: ToastOptions) => createToast('info', msg, opts),
    // Loading: persistent info toast (duration 0) until manually dismissed
    loading: (msg: string, opts?: ToastOptions) => createToast('info', msg, { ...opts, duration: 0 }),
    // Message: alias for info (Sonner compat)
    message: (msg: string, opts?: ToastOptions) => createToast('info', msg, opts),
    // Dismiss: with id dismisses one, without id dismisses all
    dismiss: (id?: string) => {
      const store = useToastStore.getState();
      if (id) {
        store.dismissToast(id);
      } else {
        store.toasts.forEach(t => store.dismissToast(t.id));
      }
    },
  }
);

/**
 * Helper functions for common toast scenarios
 */
export const toastNotifications = {
  /**
   * Execution status changes
   */
  executionStarted: (strategy: string) => {
    useToastStore.getState().addToast({
      type: 'info',
      title: 'Execution Started',
      message: `${strategy} is now running`,
      duration: 3000,
    });
  },

  executionProgress: (strategy: string, progress: number) => {
    // Only show progress milestones (25%, 50%, 75%, 100%)
    if ([25, 50, 75].includes(progress)) {
      useToastStore.getState().addToast({
        type: 'info',
        title: 'Execution in Progress',
        message: `${strategy}: ${progress}% complete`,
        duration: 2000,
      });
    }
  },

  executionSuccess: (strategy: string, details?: string) => {
    useToastStore.getState().addToast({
      type: 'success',
      title: 'Execution Successful',
      message: `${strategy} completed successfully${details ? ': ' + details : ''}`,
      duration: 5000,
    });
  },

  executionFailed: (strategy: string, error: string) => {
    useToastStore.getState().addToast({
      type: 'error',
      title: 'Execution Failed',
      message: `${strategy}: ${error}`,
      duration: 8000,
    });
  },

  executionCancelled: (strategy: string) => {
    useToastStore.getState().addToast({
      type: 'warning',
      title: 'Execution Cancelled',
      message: `${strategy} was cancelled`,
      duration: 4000,
    });
  },

  /**
   * Approval workflow
   */
  approvalRequested: (strategy: string) => {
    useToastStore.getState().addToast({
      type: 'warning',
      title: 'Approval Required',
      message: `Please approve the ${strategy} transaction in your wallet`,
      duration: 0, // Persistent until dismissed
    });
  },

  approvalApproved: (strategy: string) => {
    useToastStore.getState().addToast({
      type: 'success',
      title: 'Approved',
      message: `${strategy} transaction approved`,
      duration: 3000,
    });
  },

  approvalRejected: (strategy: string) => {
    useToastStore.getState().addToast({
      type: 'error',
      title: 'Rejected',
      message: `${strategy} transaction was rejected`,
      duration: 4000,
    });
  },

  approvalExpired: (strategy: string) => {
    useToastStore.getState().addToast({
      type: 'warning',
      title: 'Approval Expired',
      message: `${strategy} approval window expired. Please try again.`,
      duration: 5000,
    });
  },

  /**
   * Simulation & validation
   */
  simulationRunning: (strategy: string) => {
    useToastStore.getState().addToast({
      type: 'info',
      title: 'Simulating Transaction',
      message: `${strategy} simulation is running...`,
      duration: 2000,
    });
  },

  simulationFailed: (reason: string) => {
    useToastStore.getState().addToast({
      type: 'error',
      title: 'Simulation Failed',
      message: `Transaction simulation failed: ${reason}`,
      duration: 6000,
    });
  },

  /**
   * Network & blockchain
   */
  blockchainConfirmed: (txHash?: string) => {
    useToastStore.getState().addToast({
      type: 'success',
      title: 'Confirmed on Blockchain',
      message: `Transaction confirmed${txHash ? ': ' + txHash.slice(0, 8) + '...' : ''}`,
      duration: 5000,
    });
  },

  networkError: (message?: string) => {
    useToastStore.getState().addToast({
      type: 'error',
      title: 'Network Error',
      message: message || 'Unable to connect to blockchain. Please check your connection.',
      duration: 6000,
    });
  },

  rpcError: (endpoint?: string) => {
    useToastStore.getState().addToast({
      type: 'error',
      title: 'RPC Error',
      message: `RPC node error${endpoint ? ' at ' + endpoint : ''}. Retrying...`,
      duration: 4000,
    });
  },

  retrying: (attempt: number, maxAttempts: number) => {
    useToastStore.getState().addToast({
      type: 'warning',
      title: 'Retrying',
      message: `Retry attempt ${attempt} of ${maxAttempts}...`,
      duration: 2000,
    });
  },

  /**
   * Token & analysis
   */
  tokenAnalysisComplete: (tokenSymbol: string, riskScore: number) => {
    const riskLevel = riskScore >= 75 ? 'Low' : riskScore >= 50 ? 'Medium' : 'High';
    useToastStore.getState().addToast({
      type: riskScore >= 75 ? 'success' : 'warning',
      title: `${tokenSymbol} Safety Analysis Complete`,
      message: `Risk Level: ${riskLevel} (Score: ${riskScore}/100)`,
      duration: 5000,
    });
  },

  mevDetected: (riskLevel: string, estimated: string) => {
    useToastStore.getState().addToast({
      type: riskLevel === 'low' ? 'success' : 'warning',
      title: 'MEV Analysis Complete',
      message: `${riskLevel.toUpperCase()} MEV Risk - Est. Loss: ${estimated}`,
      duration: 5000,
    });
  },

  /**
   * Portfolio operations
   */
  rebalanceComplete: (changes: string[]) => {
    useToastStore.getState().addToast({
      type: 'success',
      title: 'Rebalance Complete',
      message: changes.join(', '),
      duration: 5000,
    });
  },

  dcaScheduled: (amount: string, frequency: string, token: string) => {
    useToastStore.getState().addToast({
      type: 'success',
      title: 'DCA Scheduled',
      message: `${amount} into ${token} ${frequency}`,
      duration: 5000,
    });
  },

  /**
   * Wallet & connection
   */
  walletConnected: (walletName: string, address: string) => {
    useToastStore.getState().addToast({
      type: 'success',
      title: 'Wallet Connected',
      message: `${walletName}: ${address.slice(0, 4)}...${address.slice(-4)}`,
      duration: 3000,
    });
  },

  walletDisconnected: () => {
    useToastStore.getState().addToast({
      type: 'warning',
      title: 'Wallet Disconnected',
      message: 'Please reconnect your wallet to continue',
      duration: 0, // Persistent
    });
  },

  /**
   * Gas & fees
   */
  gasWarning: (estimatedGas: string) => {
    useToastStore.getState().addToast({
      type: 'warning',
      title: 'High Gas Cost',
      message: `Estimated gas: ${estimatedGas}. Consider waiting for lower fees.`,
      duration: 6000,
    });
  },

  /**
   * Generic
   */
  info: (title: string, message: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: 'info',
      title,
      message,
      duration: duration ?? 4000,
    });
  },

  success: (title: string, message: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: 'success',
      title,
      message,
      duration: duration ?? 4000,
    });
  },

  warning: (title: string, message: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: 'warning',
      title,
      message,
      duration: duration ?? 4000,
    });
  },

  error: (title: string, message: string, duration?: number) => {
    useToastStore.getState().addToast({
      type: 'error',
      title,
      message,
      duration: duration ?? 5000,
    });
  },
};
