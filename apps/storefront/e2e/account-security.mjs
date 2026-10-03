import { chromium } from "playwright";
import { createHmac } from "node:crypto";

const B = "http://localhost:3100";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const EMAIL = "e2e-security@demo.local";
const PASSWORD = "e2e-password-1";
const NEW_PASSWORD = "e2e-password-2";
const SHOT_DIR = process.env.SECURITY_SHOTS;
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};

function base32Decode(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of input.replace(/=+$/, "")) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret, offsetSteps = 0) {
  const counter = Math.floor(Date.now() / 30000) + offsetSteps;
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

async function api(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { ...H, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

async function ensureAccount() {
  await api("/auth/register", { method: "POST", body: { name: "Security Tester", email: EMAIL, password: PASSWORD } });
}

let secret = null;
let recoveryCodes = [];

async function restore() {
  for (const password of [PASSWORD, NEW_PASSWORD]) {
    let login = await api("/auth/login", { method: "POST", body: { email: EMAIL, password } });
    if (!login.success) continue;
    if (login.data.twoFactorRequired) {
      const code = recoveryCodes.pop() ?? (secret ? totp(secret, 1) : null);
      if (!code) return "stuck behind two-step verification";
      login = await api("/auth/two-factor", { method: "POST", body: { challengeToken: login.data.challengeToken, code } });
      if (!login.success) return `two-factor restore failed: ${login.message}`;
    }
    const token = login.data.accessToken;
    const status = await api("/profile/two-factor", { token });
    if (status.data?.enabled) {
      const code = recoveryCodes.pop() ?? totp(secret, 1);
      const off = await api("/profile/two-factor/disable", { method: "POST", token, body: { code } });
      if (!off.success) return `could not disable: ${off.message}`;
    }
    await api("/profile", { method: "PATCH", token, body: { phone: null, dateOfBirth: null, gender: null } });
    if (password !== PASSWORD) {
      await api("/profile/change-password", { method: "POST", token, body: { currentPassword: password, newPassword: PASSWORD } });
    }
    return null;
  }
  return "could not sign in with either password";
}

await ensureAccount();
const preflight = await restore();
if (preflight) {
  console.log(`✗ test account not in a clean state: ${preflight}`);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = async (name) => SHOT_DIR && page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: true });

async function signIn(password) {
  await page.goto(`${B}/login?returnTo=/account`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

try {
  await signIn(PASSWORD);
  await page.waitForURL("**/account");
  await page.getByRole("heading", { name: "Your details" }).waitFor();
  ok(await page.getByText("Profile 25% complete").isVisible(), "new account shows 25% completion");
  ok(await page.locator("#profile-email").isDisabled(), "email is read-only");

  await page.fill("#profile-phone", "+8801712345678");
  await page.fill("#profile-dob", "1990-05-01");
  await page.getByRole("button", { name: "Save details" }).click();
  await page.getByText("Your details are saved.").waitFor();
  ok((await page.inputValue("#profile-phone")) === "01712345678", "phone is shown as the backend normalised it");
  ok(await page.getByText("Profile 75% complete").isVisible(), "completion updates from the server");
  await page.selectOption("#profile-gender", "PREFER_NOT_TO_SAY");
  await page.getByRole("button", { name: "Save details" }).click();
  await page.getByText("Your details are saved.").waitFor();
  ok((await page.getByText(/% complete/).count()) === 0, "completion prompt disappears at 100%");
  const stored = await api("/auth/login", { method: "POST", body: { email: EMAIL, password: PASSWORD } })
    .then((login) => api("/profile", { token: login.data.accessToken }));
  ok(stored.data.name === "Security Tester", "untouched fields are not sent or wiped");

  await page.getByRole("button", { name: "Set up two-step verification" }).click();
  const qr = page.getByRole("img", { name: /QR code/ });
  await qr.waitFor();
  ok((await qr.getAttribute("src")).startsWith("data:image/png"), "QR code renders");
  secret = (await page.locator("code").first().textContent()).replace(/\s/g, "");
  ok(/^[A-Z2-7]{16,}$/.test(secret), "secret key shown for typing in");
  await shot("security-enrol");

  await page.fill("#two-factor-confirm-code", "000000");
  await page.getByRole("button", { name: "Turn on" }).click();
  await page.getByText("That code is not valid").waitFor();
  ok(true, "wrong code is refused without signing out");
  ok(new URL(page.url()).pathname === "/account", "still on the account page after a wrong code");

  await page.fill("#two-factor-confirm-code", totp(secret));
  await page.getByRole("button", { name: "Turn on" }).click();
  await page.getByText("Two-step verification is on.").waitFor();
  recoveryCodes = await page.getByRole("list", { name: "Recovery codes" }).locator("li").allTextContents();
  ok(recoveryCodes.length === 10, "ten recovery codes shown once");
  const done = page.getByRole("button", { name: "Done" });
  ok(await done.isDisabled(), "Done stays disabled until codes are saved");
  await shot("security-codes");
  await page.getByLabel("I have saved these codes somewhere safe").check();
  await done.click();
  await page.getByText("10 recovery codes left.").waitFor();
  ok(await page.getByText("On", { exact: true }).isVisible(), "status shows On");

  await page.evaluate(() => localStorage.clear() || sessionStorage.clear());
  await signIn(PASSWORD);
  await page.getByRole("heading", { name: "Two-step verification" }).waitFor();
  ok(new URL(page.url()).pathname === "/login", "password alone no longer signs in");
  await shot("security-login-code");
  const recovery = recoveryCodes.shift();
  await page.fill("#two-factor-code", recovery.toLowerCase().replace("-", ""));
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await page.waitForURL("**/account");
  ok(true, "recovery code (typed lower-case, no dash) completes sign-in");
  await page.getByText("9 recovery codes left.").waitFor();
  ok(true, "used recovery code is consumed");

  await page.getByRole("button", { name: "Turn off" }).click();
  await page.fill("#two-factor-disable-code", recoveryCodes.shift());
  await page.getByRole("button", { name: "Turn off" }).last().click();
  await page.getByText("Two-step verification is off.").waitFor();
  ok(true, "turning off with a code works");

  await page.getByRole("button", { name: "Change password" }).click();
  await page.fill("#current-password", "not-my-password");
  await page.fill("#new-password", NEW_PASSWORD);
  await page.fill("#confirm-password", NEW_PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await page.getByRole("alert").filter({ hasText: /password/i }).waitFor();
  ok(new URL(page.url()).pathname === "/account", "wrong current password keeps you signed in");

  await page.fill("#current-password", PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await page.waitForURL("**/login**");
  ok(await page.getByText(/Your password was changed/).isVisible(), "sent to sign-in with an explanation");
  ok((await page.inputValue("#email")) === EMAIL, "email is prefilled");
  await page.fill("#password", NEW_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/account");
  ok(await page.getByText(/Last changed/).waitFor().then(() => true).catch(() => false), "new password works and shows when it changed");

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
  await shot("security-crash");
} finally {
  await browser.close();
  const problem = await restore();
  ok(problem === null, `test account restored${problem ? `: ${problem}` : ""}`);
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
