/**
 * Toast notification system for agent executions
 * Provides real-time feedback on execution status
 */

import { create } from 'zustand';
import { ExecutionStatus } from './agents';

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // milliseconds, 0 = permanent
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      ...toast,
      id,
      timestamp: Date.now(),
      duration: toast.duration ?? 5000, // Default 5s
    };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, newToast.duration);
    }

    return id;
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
      message: `Executing ${strategy}...`,
      duration: 3000,
    });
  },

  executionProgress: (strategy: string, progress: number) => {
    // Only show progress milestones (25%, 50%, 75%, 100%)
    if ([25, 50, 75].includes(progress)) {
      useToastStore.getState().addToast({
        type: 'info',
        title: 'In Progress',
        message: `${strategy}: ${progress}% complete`,
        duration: 2000,
      });
    }
  },

  executionSuccess: (strategy: string, details?: string) => {
    useToastStore.getState().addToast({
      type: 'success',
      title: '✓ Execution Successful',
      message: `${strategy} completed successfully${details ? ': ' + details : ''}`,
      duration: 5000,
    });
  },

  executionFailed: (strategy: string, error: string) => {
    useToastStore.getState().addToast({
      type: 'error',
      title: '✗ Execution Failed',
      message: `${strategy} failed: ${error}`,
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
      title: '⚠️ Approval Needed',
      message: `Please approve the ${strategy} transaction in your wallet`,
      duration: 0, // Persistent until dismissed
    });
  },

  approvalApproved: (strategy: string) => {
    useToastStore.getState().addToast({
      type: 'success',
      title: '✓ Approved',
      message: `${strategy} transaction approved`,
      duration: 3000,
    });
  },

  approvalRejected: (strategy: string) => {
    useToastStore.getState().addToast({
      type: 'error',
      title: '✗ Rejected',
      message: `${strategy} transaction was rejected`,
      duration: 4000,
    });
  },

  approvalExpired: (strategy: string) => {
    useToastStore.getState().addToast({
      type: 'warning',
      title: 'Approval Expired',
      message: `${strategy} approval expired. Please try again.`,
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
      message: `${strategy} simulation in progress...`,
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
      title: '✓ Confirmed on Blockchain',
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
      title: `${tokenSymbol} Safety Analysis`,
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
      title: '✓ Rebalance Complete',
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
