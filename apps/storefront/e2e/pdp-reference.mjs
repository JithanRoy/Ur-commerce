import { chromium } from "playwright";

const B = "http://localhost:3100";
const P = "/product/slim-fit-denim-shirt";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const page = await (await browser.newContext({
  viewport: { width: 1400, height: 900 },
})).newPage();
await page.goto(B + P, { waitUntil: "load" });
await page.waitForTimeout(2500);

const body = await page.textContent("body");
ok(body.includes("Tax included"), "tax/shipping note under the price");
ok(body.includes("Availability"), "meta list shows availability");
ok((await page.getByRole("button", { name: "Buy it now" }).count()) === 1,
   "Buy it now button present");
ok((await page.getByRole("tab", { name: "Description" }).count()) === 1 &&
   (await page.getByRole("tab", { name: "Details" }).count()) === 1,
   "Description and Details tabs render");
ok(!body.includes("Reviews"), "no fake Reviews tab (backend has none)");
ok(!/people are viewing/i.test(body), "no fabricated viewer counter");
ok((await page.getByRole("button", { name: "Copy link" }).count()) === 1,
   "share row with copy link");
ok((await page.locator('a[aria-label="Share on WhatsApp"]').count()) === 1,
   "WhatsApp share for the market");
ok(body.includes("Ask a question"), "ask-a-question mailto shown");

// Details tab: real variant table
await page.getByRole("tab", { name: "Details" }).click();
await page.waitForTimeout(400);
const tab = await page.textContent("body");
ok(tab.includes("DEN-IND-M"), "details tab lists variant SKUs");
ok(/Sold out|In stock/.test(tab), "details tab shows per-variant availability");

// buy-it-now disabled until variant chosen; sticky bar appears on scroll
ok(await page.getByRole("button", { name: "Buy it now" }).isDisabled(),
   "Buy it now disabled before selection");
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(800);
const sticky = page.locator("div.fixed.inset-x-0.bottom-0");
ok(await sticky.locator("button").isVisible(), "sticky bar appears on scroll");
ok((await sticky.textContent())?.includes("Slim Fit Denim Shirt") ?? false,
   "sticky bar names the product");
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);

// guest Buy it now → sign-in dialog with fields
await page.getByRole("button", { name: /^Indigo$|^M$/ }).first().click().catch(() => {});
for (const value of ["M", "Indigo"]) {
  const btn = page.getByRole("button", { name: value, exact: true }).first();
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(300);
}
const buyNow = page.getByRole("button", { name: "Buy it now" });
ok(await buyNow.isEnabled(), "Buy it now enables once resolved");
await buyNow.click();
await page.waitForTimeout(800);
const dialog = page.getByRole("dialog");
ok(await dialog.isVisible(), "guest Buy it now opens the sign-in dialog");
ok((await dialog.locator('input[type="email"]').count()) === 1,
   "dialog carries the embedded form");
await page.keyboard.press("Escape");

// signed-in Buy it now reaches checkout
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(B + "/login", { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(1200);
await p2.fill("#email", "shopper@demo.local");
await p2.fill("#password", "password123");
await p2.click('button[type=submit]');
await p2.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
await p2.goto(B + P, { waitUntil: "load" });
await p2.waitForTimeout(2000);
for (const value of ["M", "Indigo"]) {
  const btn = p2.getByRole("button", { name: value, exact: true }).first();
  if (await btn.count()) await btn.click();
  await p2.waitForTimeout(300);
}
await p2.getByRole("button", { name: "Buy it now" }).click();
await p2.waitForURL(/\/checkout/, { timeout: 15000 }).catch(() => {});
ok(new URL(p2.url()).pathname === "/checkout",
   `signed-in Buy it now reaches checkout (${new URL(p2.url()).pathname})`);

// clean the cart line we just added
await p2.goto(B + "/cart", { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(2000);
const remove = p2.locator('button[aria-label^="Remove"]').first();
if (await remove.count()) {
  await remove.click();
  await p2.waitForTimeout(1500);
  console.log("  (cart cleaned)");
}
await ctx2.close();
await browser.close();
