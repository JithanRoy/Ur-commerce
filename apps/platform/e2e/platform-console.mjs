import { chromium } from "playwright";

const B = "http://localhost:5373";
const API = "http://localhost:3002/api/v1";
const EMAIL = process.env.PLATFORM_OWNER_EMAIL ?? "owner@platform.local";
const PASSWORD = process.env.PLATFORM_OWNER_PASSWORD;
const LIVE = Boolean(PASSWORD);
const SHOT_DIR = process.env.PLATFORM_SHOTS;
const RUN = Date.now().toString(36);
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};

function fakeToken(email, minutes = 15) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + minutes * 60;
  return `${encode({ alg: "HS256" })}.${encode({ email, exp, role: "PLATFORM_OWNER" })}.signature`;
}

const TRANSITIONS = {
  TRIAL: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  ACTIVE: ["PAST_DUE", "SUSPENDED", "CANCELLED"],
  PAST_DUE: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "CANCELLED"],
  CANCELLED: [],
};

function storeRecord(name, subdomain, status = "ACTIVE") {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), name, subdomain, customDomain: null, status, currency: "BDT", locale: "en", timezone: "Asia/Dhaka", createdAt: now, updatedAt: now };
}

const lastPatch = { body: null };
const lastReset = { password: null };

async function mockBackend(page) {
  const stores = [storeRecord("Demo Store", "demo"), storeRecord("Nokshi House", "nokshi", "SUSPENDED")];
  const reply = (route, status, data, message = "ok") =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ success: status < 400, message, data }) });

  await page.route(`${API}/platform/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const body = request.postDataJSON?.() ?? null;
    if (path === "/platform/auth/login") {
      return body.password === "correct-horse"
        ? reply(route, 200, { accessToken: fakeToken(body.email), refreshToken: "r", role: "PLATFORM_OWNER" })
        : reply(route, 401, null, "Invalid email or password");
    }
    if (!request.headers().authorization) return reply(route, 401, null, "Unauthorized");
    if (path === "/platform/tenants" && request.method() === "GET") {
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const status = url.searchParams.get("status");
      const items = stores.filter((s) => (!search || s.name.toLowerCase().includes(search) || s.subdomain.includes(search)) && (!status || s.status === status));
      return reply(route, 200, { items, total: items.length, page: 1, limit: 20, totalPages: 1 });
    }
    if (path === "/platform/tenants" && request.method() === "POST") {
      if (stores.some((s) => s.subdomain === body.subdomain)) return reply(route, 409, null, `Subdomain "${body.subdomain}" is already taken`);
      const store = storeRecord(body.name, body.subdomain, body.status ?? "TRIAL");
      store.staff = [{ id: crypto.randomUUID(), name: body.ownerName, email: body.ownerEmail, role: "TENANT_OWNER", isActive: true, twoFactorEnabled: false, passwordChangedAt: null, createdAt: store.createdAt }];
      stores.unshift(store);
      return reply(route, 201, store);
    }
    const staffMatch = path.match(/^\/platform\/tenants\/([^/]+)\/staff(?:\/([^/]+)\/reset-password)?$/);
    if (staffMatch) {
      const owner = stores.find((s) => s.id === staffMatch[1]);
      if (!owner) return reply(route, 404, null, "Store not found");
      if (!staffMatch[2]) return reply(route, 200, owner.staff ?? []);
      const person = (owner.staff ?? []).find((u) => u.id === staffMatch[2]);
      if (!person) return reply(route, 404, null, "No owner or staff member with that id in this store");
      person.passwordChangedAt = new Date().toISOString();
      lastReset.password = body.newPassword;
      return reply(route, 200, { userId: person.id, email: person.email, role: person.role, revokedSessions: 2 });
    }
    const match = path.match(/^\/platform\/tenants\/([^/]+)(\/status)?$/);
    const store = match && stores.find((s) => s.id === match[1]);
    if (!store) return reply(route, 404, null, "Store not found");
    if (!match[2] && request.method() === "PATCH") {
      if (body.subdomain && stores.some((s) => s.subdomain === body.subdomain && s.id !== store.id)) return reply(route, 409, null, `Subdomain "${body.subdomain}" is already taken`);
      lastPatch.body = body;
      Object.assign(store, body, { updatedAt: new Date().toISOString() });
      return reply(route, 200, store);
    }
    if (match[2]) {
      if (!TRANSITIONS[store.status].includes(body.status)) return reply(route, 400, null, "Not allowed");
      store.status = body.status;
      store.updatedAt = new Date().toISOString();
    }
    return reply(route, 200, store);
  });
}

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) => (SHOT_DIR ? page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: true }) : null);
const password = LIVE ? PASSWORD : "correct-horse";
const subdomain = `e2e-${RUN}`;
console.log(LIVE ? "  (live: signing in for real)" : "  (mocked backend: set PLATFORM_OWNER_PASSWORD to run live)");

try {
  if (!LIVE) await mockBackend(page);

  await page.goto(`${B}/`, { waitUntil: "networkidle" });
  ok(new URL(page.url()).pathname === "/login", "signed-out visitors are sent to sign in");

  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByText("Invalid email or password").waitFor();
  ok(true, "a wrong password is explained");

  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Stores" }).waitFor();
  ok(await page.getByText(EMAIL).isVisible(), "header shows who is signed in");
  ok(await page.getByText(/Session ends/).isVisible(), "header shows when the session ends");
  const rowsBefore = await page.locator("tbody tr").count();
  ok(rowsBefore > 0, `store list shows ${rowsBefore} store(s)`);
  await shot("stores");

  if (!LIVE) {
    const strip = page.getByRole("region", { name: "Stores by status" });
    await strip.getByRole("button", { name: /Suspended/ }).click();
    await page.waitForURL(/status=SUSPENDED/);
    await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 1, null, { timeout: 5000 }).catch(() => {});
    ok((await page.locator("tbody tr").count()) === 1 && (await page.locator("tbody tr").filter({ hasText: "Nokshi House" }).count()) === 1, "status filter narrows the list");
    await strip.getByRole("button", { name: /Suspended/ }).click();
    await page.waitForURL((url) => !url.search.includes("status="));
    await page.getByLabel("Search stores").fill("zzz-nothing");
    await page.getByText("No stores match").waitFor();
    ok(true, "search with no match says so");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.locator("tbody tr").first().waitFor();
  }

  await page.getByRole("link", { name: "New store" }).first().click();
  await page.getByRole("heading", { name: "New store" }).waitFor();
  await page.getByRole("button", { name: "Create store" }).click();
  ok(await page.getByText("At least 2 characters").first().isVisible(), "empty form shows what's missing");

  await page.getByLabel("Store name").fill(`E2E Shop ${RUN}`);
  ok((await page.getByLabel("Subdomain").inputValue()) === `e2e-shop-${RUN}`, "subdomain is suggested from the name");
  await page.getByLabel("Subdomain").fill("admin");
  await page.getByRole("button", { name: "Create store" }).click();
  ok(await page.getByText("That name is reserved for the platform").isVisible(), "reserved subdomains are refused");
  await page.getByLabel("Subdomain").fill(subdomain);
  ok(await page.getByText(`${subdomain}.localhost:3100`).isVisible(), "shows the shop's future address");
  await page.getByLabel("Owner name").fill("E2E Owner");
  await page.getByLabel("Owner email").fill(`owner-${RUN}@example.com`);
  await page.getByRole("button", { name: "Generate" }).click();
  const generated = await page.getByLabel("Temporary password", { exact: true }).inputValue();
  ok(generated.length >= 12, "a strong temporary password can be generated");
  await shot("new-store");
  await page.getByRole("button", { name: "Create store" }).click();

  await page.getByRole("heading", { name: `E2E Shop ${RUN} is ready` }).waitFor();
  ok(await page.getByText(generated).isVisible(), "handover shows the password once to send to the owner");
  ok(await page.getByText(`owner-${RUN}@example.com`).isVisible(), "handover shows the owner's email");
  ok(await page.getByRole("button", { name: "Copy sign-in details" }).isVisible(), "sign-in details can be copied");
  await shot("handover");

  await page.getByRole("link", { name: "View store" }).click();
  await page.getByRole("heading", { name: `E2E Shop ${RUN}`, exact: true }).waitFor();
  const panel = page.getByRole("region", { name: "Status" });
  const badge = (label) => page.locator("main header").getByText(label, { exact: true });
  ok(await badge("Trial").isVisible(), "new store starts on trial");

  const details = page.getByRole("region", { name: "Details" });
  await details.getByRole("button", { name: "Edit details" }).click();
  await details.getByLabel("Store name").fill(`E2E Shop ${RUN} Renamed`);
  await details.getByLabel("Subdomain").fill(`${subdomain}-x`);
  ok(await details.getByRole("note").getByText(`${subdomain}-x.localhost:3100`).isVisible(), "changing the subdomain warns that the old address stops working");
  await details.getByLabel("Own domain").fill("https://bad domain");
  await details.getByRole("button", { name: "Save details" }).click();
  ok(await details.getByText(/Enter a domain like/).isVisible(), "a malformed own domain is refused");
  await details.getByLabel("Own domain").fill("");
  await details.getByLabel("Subdomain").fill(subdomain);
  ok((await details.getByRole("note").count()) === 0, "no warning when the subdomain is unchanged");
  await details.getByRole("button", { name: "Save details" }).click();
  await page.getByRole("heading", { name: `E2E Shop ${RUN} Renamed`, exact: true }).waitFor();
  ok(true, "renaming the store saves and updates the page");
  if (!LIVE) ok(JSON.stringify(lastPatch.body) === JSON.stringify({ name: `E2E Shop ${RUN} Renamed` }), `only the changed field is sent (${JSON.stringify(lastPatch.body)})`);
  await details.getByRole("button", { name: "Edit details" }).click();
  await details.getByLabel("Store name").fill(`E2E Shop ${RUN}`);
  await details.getByRole("button", { name: "Save details" }).click();
  await page.getByRole("heading", { name: `E2E Shop ${RUN}`, exact: true }).waitFor();

  const people = page.getByRole("region", { name: "Owners and staff" });
  const ownerRow = people.locator("li").filter({ hasText: `owner-${RUN}@example.com` });
  await ownerRow.waitFor();
  ok(await ownerRow.getByText("Owner", { exact: true }).isVisible(), "the store's owner is listed");
  await ownerRow.getByRole("button", { name: "Reset password" }).click();
  const newPassword = await ownerRow.getByLabel("New password", { exact: true }).inputValue();
  ok(newPassword.length >= 12, "a new password is suggested");
  await ownerRow.getByRole("button", { name: "Reset password" }).click();
  await ownerRow.getByText(`Password reset for E2E Owner`).waitFor();
  ok(await ownerRow.getByText(newPassword).isVisible(), "the new password is shown once to send on");
  if (!LIVE) ok(lastReset.password === newPassword && await ownerRow.getByText("Signed out of 2 devices").isVisible(), "the reset sends that password and reports the devices signed out");
  await shot("people");
  await ownerRow.getByRole("button", { name: "Done" }).click();
  ok(await ownerRow.getByText(/Password changed/).isVisible(), "the list shows the password was just changed");

  await panel.getByRole("button", { name: "Suspend", exact: true }).click();
  ok(await panel.getByRole("alertdialog").getByText(/locked out of the admin panel/).isVisible(), "suspending explains what it does");
  await panel.getByRole("alertdialog").getByRole("button", { name: "Suspend", exact: true }).click();
  await panel.getByRole("button", { name: "Activate", exact: true }).waitFor();
  ok(await badge("Suspended").isVisible(), "store shows as suspended");
  await shot("suspended");

  await panel.getByRole("button", { name: "Activate", exact: true }).click();
  await panel.getByRole("alertdialog").getByRole("button", { name: "Activate", exact: true }).click();
  await panel.getByRole("button", { name: "Suspend", exact: true }).waitFor();
  ok(await badge("Active").isVisible(), "store can be reactivated");

  await panel.getByRole("button", { name: "Close store permanently" }).click();
  const confirm = panel.getByRole("alertdialog").getByRole("button", { name: "Close store permanently" });
  ok(await confirm.isDisabled(), "closing for good needs the subdomain typed first");
  await panel.getByLabel(`Type ${subdomain} to confirm`).fill(subdomain);
  await confirm.click();
  await panel.getByText("A cancelled store can't change status.").waitFor();
  ok(true, "a cancelled store offers no further changes");

  await page.getByRole("link", { name: "Stores" }).first().click();
  await page.locator("tbody tr").filter({ hasText: `E2E Shop ${RUN}` }).waitFor();
  ok((await page.locator("tbody tr").count()) === rowsBefore + 1, "the new store appears in the list");

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
  await page.goto(`${B}/`, { waitUntil: "networkidle" });
  ok(new URL(page.url()).pathname === "/login", "signing out ends access");

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
  await shot("crash");
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
