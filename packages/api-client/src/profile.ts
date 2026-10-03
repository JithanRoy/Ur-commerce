import type { ApiClient } from "./client";
import type { Role } from "./types";

export const GENDERS = [
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
] as const;

export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

export const PROFILE_NAME_MIN_LENGTH = 3;
export const PROFILE_NAME_MAX_LENGTH = 120;
export const PASSWORD_MIN_LENGTH = 8;

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
  passwordChangedAt: string | null;
  completion: number;
};

export type UpdateProfileInput = {
  name?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResult = {
  passwordChanged: true;
  revokedSessions: number;
};

export type TwoFactorStatus = {
  enabled: boolean;
  required: boolean;
  enrolmentPending: boolean;
  recoveryCodesRemaining: number;
};

export type TwoFactorEnrolment = {
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
};

export type TwoFactorConfirmation = {
  enabled: true;
  recoveryCodes: string[];
};

export type RecoveryCodes = {
  recoveryCodes: string[];
};

export function createProfileApi(client: ApiClient) {
  return {
    get: () => client.get<Profile>("/profile"),
    update: (input: UpdateProfileInput) =>
      client.patch<Profile>("/profile", input),
    changePassword: (input: ChangePasswordInput) =>
      client.post<ChangePasswordResult>("/profile/change-password", input, {
        rejectsCredentials: true,
      }),
    twoFactor: {
      status: () => client.get<TwoFactorStatus>("/profile/two-factor"),
      enrol: () => client.post<TwoFactorEnrolment>("/profile/two-factor/enrol"),
      confirm: (code: string) =>
        client.post<TwoFactorConfirmation>(
          "/profile/two-factor/confirm",
          { code },
          { rejectsCredentials: true },
        ),
      disable: (code: string) =>
        client.post<{ enabled: false }>(
          "/profile/two-factor/disable",
          { code },
          { rejectsCredentials: true },
        ),
      regenerateRecoveryCodes: (code: string) =>
        client.post<RecoveryCodes>(
          "/profile/two-factor/recovery-codes",
          { code },
          { rejectsCredentials: true },
        ),
    },
  };
}

export type ProfileApi = ReturnType<typeof createProfileApi>;
