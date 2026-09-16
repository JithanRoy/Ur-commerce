import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

// signed OUT → prompted to sign in
let ctx = await browser.newContext();
let page = await ctx.newPage();
await page.goto(B + "/account/orders", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
let body = await page.textContent("body");
ok(body.includes("Sign in to see your orders"), "signed out: prompted to sign in");
await ctx.close();

// signed IN → history renders
ctx = await browser.newContext();
page = await ctx.newPage();
await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.fill("#email", "shopper@demo.local");
await page.fill("#password", "password123");
await page.click('button[type=submit]');
await page.waitForTimeout(3000);

await page.goto(B + "/account/orders", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
body = await page.textContent("body");
ok(body.includes("ORD-202609-"), "order history lists real orders");
ok(body.includes("Slim Fit Denim Shirt"), "shows product names");
ok(/৳4,998/.test(body), "grand total formatted");
ok(body.includes("Awaiting confirmation") || body.includes("Being prepared") || body.includes("Confirmed"), "shopper-friendly status label");

await page.click('a[href^="/account/orders/"]');
await page.waitForTimeout(2000);
body = await page.textContent("body");
ok(page.url().match(/\/account\/orders\/[0-9a-f-]{36}/), "opens order detail");
ok(body.includes("DEN-IND-M") || body.includes("Size: M, Colour: Indigo"), "line item snapshot shown");
ok(body.includes("Gulshan"), "shipping address snapshot shown");
ok(body.includes("Progress"), "timeline shown");
ok(body.includes("Cash on delivery"), "payment method shown");

// another customer's order → not found, not their data
await page.goto(B + "/account/orders/332eb69e-573a-4682-9c34-463f904111ae", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
body = await page.textContent("body");
ok(body.includes("Order not found"), "another customer's order is NOT visible");
ok(!body.includes("Browser Buyer"), "no other customer data leaked");

await browser.close();
