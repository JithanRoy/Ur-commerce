import { chromium } from "playwright";
const B = "http://localhost:5273";
const browser = await chromium.launch();
const ok = (c,n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

// Forged session in localStorage — the old guard would have trusted this
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  localStorage.setItem("admin-auth", JSON.stringify({
    state: { session: { accessToken: "forged.not.real", refreshToken: "forged.refresh", role: "TENANT_OWNER" } },
    version: 0,
  }));
});
const page = await ctx.newPage();
await page.goto(B + "/products", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
const path = new URL(page.url()).pathname;
ok(path === "/login", `forged token rejected → /login (got ${path})`);
const body = await page.textContent("body");
ok(!body.includes("New product"), "forged session never renders the panel");

// Expired-but-real-shaped token
const ctx2 = await browser.newContext();
await ctx2.addInitScript(() => {
  localStorage.setItem("admin-auth", JSON.stringify({
    state: { session: {
      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4Iiwicm9sZSI6IlRFTkFOVF9PV05FUiIsImV4cCI6MTAwMDAwMDAwMH0.bad",
      refreshToken: "also.bad", role: "TENANT_OWNER" } },
    version: 0,
  }));
});
const p2 = await ctx2.newPage();
await p2.goto(B + "/categories", { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(4000);
ok(new URL(p2.url()).pathname === "/login", `expired token rejected → /login (got ${new URL(p2.url()).pathname})`);

// localStorage cleared after rejection
const stored = await p2.evaluate(() => {
  const raw = localStorage.getItem("admin-auth");
  return raw ? JSON.parse(raw).state.session : null;
});
ok(stored === null, "rejected session cleared from storage");
await browser.close();
