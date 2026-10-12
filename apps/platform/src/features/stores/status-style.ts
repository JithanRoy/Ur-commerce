import type { StoreStatus } from "@urcommerce/api-client";

export const statusDot: Record<StoreStatus, string> = {
  TRIAL: "bg-status-trial",
  ACTIVE: "bg-status-active",
  PAST_DUE: "bg-status-past-due",
  SUSPENDED: "bg-status-suspended",
  CANCELLED: "bg-status-cancelled",
};
