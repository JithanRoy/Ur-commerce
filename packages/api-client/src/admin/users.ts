export type StaffRole = "TENANT_OWNER" | "TENANT_STAFF";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffInput = {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
};

export type UpdateStaffInput = {
  name?: string;
  password?: string;
  role?: StaffRole;
  isActive?: boolean;
};

export type AdminUserQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  TENANT_OWNER: "Owner",
  TENANT_STAFF: "Staff",
};
