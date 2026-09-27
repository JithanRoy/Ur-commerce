import { chromium } from "playwright";
const B = "http://localhost:3100";
const API = "http://localhost:3002/api/v1";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

async function apiLogin() {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" },
    body: JSON.stringify({ email: "shopper@demo.local", password: "password123" }),
  });
  return (await r.json()).data;
}

// a second "device" signed in before we sign out everywhere
const otherDevice = await apiLogin();

const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on("response", (r) => {
  if (r.url().includes("/auth/logout-all")) console.log("  logout-all →", r.status());
});
page.on("dialog", (d) => d.accept());

await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.fill("#email", "shopper@demo.local");
await page.fill("#password", "password123");
await page.click('button[type=submit]');
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
await page.waitForTimeout(800);

await page.click('button[aria-label="Your account"]');
await page.waitForTimeout(400);
const item = page.getByRole("menuitem", { name: "Sign out of all devices" });
ok(await item.isVisible(), "menu offers Sign out of all devices");
await item.click();
await page.waitForTimeout(3000);

const stored = await page.evaluate(() => ({
  local: localStorage.getItem("storefront-auth"),
  session: sessionStorage.getItem("storefront-auth"),
}));
ok(stored.local === null && stored.session === null,
   `local session cleared (${JSON.stringify(stored)})`);

const notice = await page.textContent("body");
ok(/Signed out of \d+ device/.test(notice), "shows the revoked-device count");

const replay = await fetch(`${API}/auth/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" },
  body: JSON.stringify({ refreshToken: otherDevice.refreshToken }),
});
ok(!replay.ok, `the OTHER device's session was revoked too (${replay.status})`);

await browser.close();
