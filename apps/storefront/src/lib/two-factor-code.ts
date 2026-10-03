const AUTHENTICATOR_CODE = /^\d{6}$/;
const RECOVERY_CODE = /^[A-Z0-9]{5}-[A-Z0-9]{5}$/;

export function normaliseCode(raw: string): string {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  if (/^[A-Z0-9]{10}$/.test(compact) && /[A-Z]/.test(compact)) {
    return `${compact.slice(0, 5)}-${compact.slice(5)}`;
  }
  return compact;
}

export function isAuthenticatorCode(code: string): boolean {
  return AUTHENTICATOR_CODE.test(code);
}

export function isPlausibleCode(code: string): boolean {
  return AUTHENTICATOR_CODE.test(code) || RECOVERY_CODE.test(code);
}

export const CODE_FORMAT_HINT =
  "Enter the 6-digit code from your app, or a recovery code like ABCDE-FGHJK.";
