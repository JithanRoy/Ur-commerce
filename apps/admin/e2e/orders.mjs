import { chromium } from "playwright";
const B = "http://localhost:5273";
const browser = await chromium.launch();
const page = await browser.newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.fill("#email", "admin@demo.local");
await page.fill("#password", "password123");
await page.click('button[type=submit]');
await page.waitForURL(/\/products/, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);

await page.click('a[href="/orders"]');
await page.waitForTimeout(2000);
let body = await page.textContent("body");
ok(page.url().includes("/orders"), "Orders nav works");
ok(body.includes("ORD-202609-"), "order list shows real orders");
ok(body.includes("Browser Buyer") || body.includes("Test Shopper"), "customer names shown");
ok(/৳4,998/.test(body), "grand total formatted in ৳");
ok(body.includes("Pending payment") || body.includes("Confirmed"), "status badges render");

await page.click('a:has-text("ORD-202609-")');
await page.waitForTimeout(2000);
body = await page.textContent("body");
ok(page.url().includes("/orders/"), "detail page opens");
ok(body.includes("DEN-IND-M"), "line item SKU snapshot shown");
ok(body.includes("Size: M, Colour: Indigo"), "optionSummary snapshot shown");
ok(body.includes("Gulshan"), "shipping address snapshot shown");
ok(body.includes("Cash on delivery"), "payment method shown");
ok(body.includes("Timeline"), "timeline section shown");

const before = await page.textContent("body");
const btn = page.locator('button:has-text("Mark ")').first();
if (await btn.count()) {
  const label = await btn.textContent();
  await btn.click();
  await page.waitForTimeout(2500);
  const after = await page.textContent("body");
  ok(after !== before, `status transition applied (${label?.trim()})`);
} else {
  ok(before.includes("No further changes"), "terminal status shows no actions");
}
await browser.close();
