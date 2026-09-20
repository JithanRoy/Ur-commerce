import { chromium } from "playwright";
const B = "http://localhost:5273";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

async function signIn(ctx, email) {
  const page = await ctx.newPage();
  await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click('button[type=submit]');
  await page.waitForURL(/\/products/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  return page;
}

// OWNER
let ctx = await browser.newContext();
let page = await signIn(ctx, "admin@demo.local");
let body = await page.textContent("body");
ok(body.includes("Team"), "owner sees Team in the sidebar");

await page.click('a[href="/team"]');
await page.waitForTimeout(2000);
body = await page.textContent("body");
ok(page.url().includes("/team"), "Team page opens");
ok(body.includes("Demo Owner"), "lists the owner");
ok(body.includes("staff@demo.local"), "lists the staff member");
ok(body.includes("you"), "marks the current user");
ok(!body.includes("password") || !body.includes("$2"), "no password hash rendered");

// self-protection: own row controls disabled
const selfRow = page.locator('tr', { hasText: "Demo Owner" });
const selfBtn = selfRow.locator('button:has-text("Revoke access")');
ok(await selfBtn.isDisabled(), "cannot revoke your own access");
const selfRole = selfRow.locator("select");
ok(await selfRole.isDisabled(), "cannot change your own role");

// revoke the staff member's access
const staffRow = page.locator('tr', { hasText: "staff@demo.local" });
await staffRow.locator('button:has-text("Revoke access")').click();
await page.waitForTimeout(2500);
body = await page.textContent("body");
ok(body.includes("Access revoked") || body.includes("Disabled"), "access revoked");

// restore it
await page.locator('tr', { hasText: "staff@demo.local" }).locator('button:has-text("Restore access")').click();
await page.waitForTimeout(2500);
ok((await page.textContent("body")).includes("Active"), "access restored");
await ctx.close();

// STAFF — must not see or use Team
ctx = await browser.newContext();
page = await signIn(ctx, "staff@demo.local");
body = await page.textContent("body");
ok(!body.includes("Team"), "staff does NOT see Team in the sidebar");

await page.goto(B + "/team", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
body = await page.textContent("body");
ok(body.includes("Only the store owner"), "staff visiting /team directly is refused");
ok(!body.includes("admin@demo.local"), "no team data leaked to staff");

await browser.close();
