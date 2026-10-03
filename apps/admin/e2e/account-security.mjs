import { chromium } from "playwright";
import { createHmac } from "node:crypto";

const B = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const OWNER_EMAIL = process.env.ADMIN_EMAIL ?? "admin@demo.local";
const OWNER_PASSWORD = process.env.ADMIN_PASSWORD ?? "password123";
const STAFF_EMAIL = "e2e-staff-security@demo.local";
const PASSWORD = "e2e-staff-pass-1";
const NEW_PASSWORD = "e2e-staff-pass-2";
const SHOT_DIR = process.env.SECURITY_SHOTS;
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};

function base32Decode(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of input.replace(/=+$/, "")) bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret) {
  const counter = Math.floor(Date.now() / 30000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

async function nextWindow() {
  const wait = 30000 - (Date.now() % 30000) + 500;
  await new Promise((resolve) => setTimeout(resolve, wait));
}

async function api(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { ...H, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

let secret = null;
let recoveryCodes = [];

async function ensureStaff() {
  const owner = await api("/auth/login", { method: "POST", body: { email: OWNER_EMAIL, password: OWNER_PASSWORD } });
  const token = owner.data.accessToken;
  const existing = await api(`/admin/users?search=${encodeURIComponent(STAFF_EMAIL)}`, { token });
  if (!existing.data?.items?.some((u) => u.email === STAFF_EMAIL)) {
    const created = await api("/admin/users", {
      method: "POST",
      token,
      body: { name: "Security Staff", email: STAFF_EMAIL, password: PASSWORD, role: "TENANT_STAFF" },
    });
    if (!created.success) throw new Error(`could not create staff: ${created.message}`);
  }
}

async function restoreStaff() {
  for (const password of [PASSWORD, NEW_PASSWORD]) {
    let login = await api("/auth/login", { method: "POST", body: { email: STAFF_EMAIL, password } });
    if (!login.success) continue;
    if (login.data.twoFactorRequired) {
      const code = recoveryCodes.pop();
      if (!code) return "stuck behind two-step verification";
      login = await api("/auth/two-factor", { method: "POST", body: { challengeToken: login.data.challengeToken, code } });
      if (!login.success) return `two-factor restore failed: ${login.message}`;
    }
    const token = login.data.accessToken;
    const status = await api("/profile/two-factor", { token });
    if (status.data?.enabled) {
      const off = await api("/profile/two-factor/disable", { method: "POST", token, body: { code: recoveryCodes.pop() } });
      if (!off.success) return `could not disable: ${off.message}`;
    }
    if (password !== PASSWORD) {
      await api("/profile/change-password", { method: "POST", token, body: { currentPassword: password, newPassword: PASSWORD } });
    }
    return null;
  }
  return "could not sign in with either password";
}

await ensureStaff();
const preflight = await restoreStaff();
if (preflight) {
  console.log(`✗ staff test account not clean: ${preflight}`);
  process.exit(1);
}
const ownerStatus = await api("/auth/login", { method: "POST", body: { email: OWNER_EMAIL, password: OWNER_PASSWORD } })
  .then((login) => api("/profile/two-factor", { token: login.data.accessToken }));

const browser = await chromium.launch();
const errors = [];

async function newPage() {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  return page;
}

async function signIn(page, email, password) {
  await page.goto(`${B}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

try {
  const owner = await newPage();
  await signIn(owner, OWNER_EMAIL, OWNER_PASSWORD);
  await owner.waitForURL((url) => !url.pathname.startsWith("/login"));
  if (!ownerStatus.data.enabled) {
    const reminder = owner.getByText("Store owners need two-step verification.");
    await reminder.waitFor();
    ok(true, "owner without two-step sees the reminder banner");
    await owner.getByRole("link", { name: "Set it up" }).click();
    await owner.waitForURL("**/account");
    ok((await owner.getByText("Store owners need two-step verification.", { exact: false }).count()) === 1, "banner hides on the account page; card explains it is required");
  } else {
    await owner.goto(`${B}/account`);
    await owner.getByRole("heading", { name: "Two-step verification" }).waitFor();
    ok((await owner.getByRole("button", { name: "Turn off" }).count()) === 0, "owners never see Turn off");
  }
  ok(await owner.getByRole("heading", { name: "Your details" }).waitFor().then(() => true).catch(() => false), "owner account page shows details");
  await owner.getByRole("link", { name: /Your account:/ }).waitFor();
  ok(true, "topbar name links to the account page");
  await owner.context().close();

  const page = await newPage();
  await signIn(page, STAFF_EMAIL, PASSWORD);
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  ok((await page.getByText("Store owners need two-step verification.").count()) === 0, "staff do not get the owner reminder");
  await page.getByRole("link", { name: /Your account:/ }).click();
  await page.waitForURL("**/account");

  await page.getByRole("button", { name: "Set up two-step verification" }).click();
  await page.getByRole("img", { name: /QR code/ }).waitFor();
  secret = (await page.locator("code").first().textContent()).replace(/\s/g, "");
  await page.fill("#two-factor-confirm-code", "000000");
  await page.getByRole("button", { name: "Turn on" }).click();
  await page.getByText("That code is not valid").waitFor();
  ok(new URL(page.url()).pathname === "/account", "wrong code keeps you signed in");
  await page.fill("#two-factor-confirm-code", totp(secret));
  await page.getByRole("button", { name: "Turn on" }).click();
  await page.getByRole("list", { name: "Recovery codes" }).waitFor();
  recoveryCodes = await page.getByRole("list", { name: "Recovery codes" }).locator("li").allTextContents();
  ok(recoveryCodes.length === 10, "staff can turn on two-step and get recovery codes");
  if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/admin-security.png`, fullPage: true });
  await page.getByLabel("I have saved these codes somewhere safe").check();
  await page.getByRole("button", { name: "Done" }).click();
  ok(await page.getByRole("button", { name: "Turn off" }).isVisible(), "staff may turn it off");

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
  await nextWindow();
  await signIn(page, STAFF_EMAIL, PASSWORD);
  await page.getByRole("heading", { name: "Two-step verification" }).waitFor();
  ok(true, "password alone now asks for a code");
  await page.fill("#two-factor-code", totp(secret));
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  ok(true, "authenticator code completes admin sign-in");

  await page.goto(`${B}/account`);
  await page.getByRole("button", { name: "Turn off" }).click();
  await page.fill("#two-factor-disable-code", recoveryCodes.shift());
  await page.getByRole("button", { name: "Turn off" }).last().click();
  await page.getByText("Two-step verification is off.").first().waitFor();
  ok(true, "turned off with a recovery code");
  recoveryCodes = [];

  await page.getByRole("button", { name: "Change password" }).click();
  await page.fill("#current-password", PASSWORD);
  await page.fill("#new-password", NEW_PASSWORD);
  await page.fill("#confirm-password", NEW_PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await page.waitForURL("**/login");
  ok(await page.getByText(/Your password was changed/).waitFor().then(() => true).catch(() => false), "sent to sign-in with an explanation");
  ok((await page.inputValue("#email")) === STAFF_EMAIL, "email is prefilled");
  await page.fill("#password", NEW_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  ok(true, "new password signs in");

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
} finally {
  await browser.close();
  const problem = await restoreStaff();
  ok(problem === null, `staff test account restored${problem ? `: ${problem}` : ""}`);
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
