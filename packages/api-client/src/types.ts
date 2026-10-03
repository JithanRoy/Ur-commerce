export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Role = "CUSTOMER" | "TENANT_STAFF" | "TENANT_OWNER";

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  role: Role;
};

export type TwoFactorChallenge = {
  twoFactorRequired: true;
  challengeToken: string;
};

export type LoginResult = LoginResponse | TwoFactorChallenge;

export function isTwoFactorChallenge(
  result: LoginResult,
): result is TwoFactorChallenge {
  return "twoFactorRequired" in result && result.twoFactorRequired;
}

export const isStaffRole = (role: Role): boolean =>
  role === "TENANT_OWNER" || role === "TENANT_STAFF";
