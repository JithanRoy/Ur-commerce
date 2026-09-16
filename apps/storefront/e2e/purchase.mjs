import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);
const email = `buyer-${Date.now()}@demo.local`;

// 1. add to cart as a GUEST
await page.goto(B + "/product/slim-fit-denim-shirt", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
await page.click('button[aria-pressed]:has-text("M")');
await page.waitForTimeout(250);
await page.click('button[aria-pressed]:has-text("Indigo")');
await page.waitForTimeout(500);
await page.click('button:has-text("Add to cart")');
await page.waitForURL(/\/cart/, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
let body = await page.textContent("body");
ok(page.url().includes("/cart"), "guest add-to-cart navigates to /cart");
ok(body.includes("Slim Fit Denim Shirt"), "cart shows the product");
ok(body.includes("M · Indigo") || body.includes("M") && body.includes("Indigo"), "cart shows flattened options");
ok(/৳2,499/.test(body), "cart shows the line total");

// 2. increase quantity
await page.click('button[aria-label="Increase quantity"]');
await page.waitForTimeout(1500);
body = await page.textContent("body");
ok(/৳4,998/.test(body), "quantity increase updates the line total");

// 3. checkout requires sign-in
await page.goto(B + "/checkout", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
ok((await page.textContent("body")).includes("Sign in to check out"), "checkout prompts a guest to sign in");

// 4. register -> guest cart should merge
await page.goto(B + `/register`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
await page.fill("#name", "Browser Buyer");
await page.fill("#email", email);
await page.fill("#password", "password123");
await page.click('button[type=submit]');
await page.waitForTimeout(3000);
await page.goto(B + "/cart", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1800);
body = await page.textContent("body");
ok(body.includes("Slim Fit Denim Shirt"), "guest cart MERGED into the new account");

// 5. checkout: add address, place order
await page.goto(B + "/checkout", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1800);
await page.fill("#fullName", "Browser Buyer");
await page.fill("#phone", "01712345678");
await page.fill("#thana", "Gulshan");
await page.fill("#addressLine", "House 9, Road 4");
await page.click('button:has-text("Save address")');
await page.waitForTimeout(2500);
body = await page.textContent("body");
ok(body.includes("Gulshan"), "saved address appears as selectable");
ok(/Total/.test(body), "order summary shows a total");

await page.click('button:has-text("Place order")');
await page.waitForURL(/\/order\//, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
body = await page.textContent("body");
ok(page.url().includes("/order/ORD-"), `order placed → ${new URL(page.url()).pathname}`);
ok(body.includes("Thank you for your order"), "confirmation page shown");

await browser.close();
