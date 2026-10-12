import type { StoreStatus } from "@urcommerce/api-client";

export const statusDot: Record<StoreStatus, string> = {
  TRIAL: "bg-status-trial",
  ACTIVE: "bg-status-active",
  PAST_DUE: "bg-status-past-due",
  SUSPENDED: "bg-status-suspended",
  CANCELLED: "bg-status-cancelled",
};

export const statusText: Record<StoreStatus, string> = {
  TRIAL: "text-status-trial",
  ACTIVE: "text-status-active",
  PAST_DUE: "text-status-past-due",
  SUSPENDED: "text-status-suspended",
  CANCELLED: "text-status-cancelled",
};
