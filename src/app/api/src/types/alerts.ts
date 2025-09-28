// Gas Alert interfaces based on database schema
export interface GasAlert {
  id: number;
  email: string;
  conditionType: string;
  thresholdUsd: number;
  minGasUnits: number;
  verified: boolean;
  verifyToken: string | null;
  active: boolean;
  lastNotifiedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// Request body interface for alert subscription API
export interface AlertSubscriptionRequest {
  email: string;
  thresholdUsd?: number;
  minGasUnits?: number;
}

// Response interface for alert cron API
export interface AlertCronResponse {
  ok: boolean;
  checked: number;
  notified: number;
  errors: number;
  gasPrice?: number;
  ethPrice?: number;
}