import { chromium } from "playwright";

const B = "http://localhost:3100";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

// ---------- guest ----------
const guest = await browser.newContext();
const g = await guest.newPage();
await g.goto(B + "/", { waitUntil: "load" });
await g.waitForTimeout(3000);

const cards = g.locator("section:has-text('New Arrivals') div[class*=grid] > div");
ok((await cards.count()) >= 3, `cards render (${await cards.count()})`);

ok((await g.getByRole("button", { name: "Buy now" }).count()) >= 3,
   "every card offers Buy now");
const addLabels = await g.locator("section:has-text('New Arrivals') button").allTextContents();
ok(addLabels.some((t) => /Add to bag/.test(t)) &&
   addLabels.some((t) => /Choose options/.test(t)),
   "single-variant shows Add to bag, multi shows Choose options");

// guest Buy now → dialog, NOT a redirect
await g.getByRole("button", { name: "Buy now" }).first().click();
await g.waitForTimeout(800);
const dialog = g.getByRole("dialog");
ok(await dialog.isVisible(), "guest Buy now opens a dialog");
ok(new URL(g.url()).pathname === "/", `stays on the page (${new URL(g.url()).pathname})`);
ok((await dialog.getByRole("button", { name: "Sign in" }).count()) > 0,
   "dialog offers Sign in");
ok((await dialog.getByRole("link", { name: "Create an account" }).count()) > 0,
   "dialog offers Create an account");

const href = await dialog.getByRole("link", { name: "Create an account" }).getAttribute("href");
ok(href?.includes("returnTo="), `register link carries returnTo (${href})`);

await g.keyboard.press("Escape");
await g.waitForTimeout(500);
ok(!(await g.getByRole("dialog").isVisible().catch(() => false)),
   "Escape closes the dialog");

// guest CAN still add to bag without signing in
const addBtn = g.getByRole("button", { name: "Add to bag" }).first();
if ((await addBtn.count()) > 0) {
  await addBtn.click();
  await g.waitForFunction(
    () => document.querySelector('a[href="/cart"] span')?.textContent === "1",
    undefined, { timeout: 12000 },
  ).then(() => true).catch(() => false);
  const badge = await g.evaluate(() =>
    document.querySelector('a[href="/cart"] span')?.textContent ?? null);
  ok(badge === "1", `guest can add to bag without signing in (badge ${badge})`);
}
await guest.close();

// ---------- signed in ----------
const ctx = await browser.newContext();
const p = await ctx.newPage();
await p.goto(B + "/login", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
await p.fill("#email", "shopper@demo.local");
await p.fill("#password", "password123");
await p.click('button[type=submit]');
await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
await p.goto(B + "/", { waitUntil: "load" });
await p.waitForTimeout(3000);

await p.getByRole("button", { name: "Buy now" }).first().click();
await p.waitForTimeout(1200);
ok(!(await p.getByRole("dialog").isVisible().catch(() => false)),
   "signed-in Buy now shows NO dialog");
await p.waitForURL(/\/checkout/, { timeout: 15000 }).catch(() => {});
ok(new URL(p.url()).pathname === "/checkout",
   `signed-in Buy now reaches checkout (${new URL(p.url()).pathname})`);

await ctx.close();
await browser.close();
