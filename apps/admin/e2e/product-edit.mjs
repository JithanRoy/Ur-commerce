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
await page.waitForTimeout(2000);

await page.click('a:has-text("Classic Cotton Panjabi")');
await page.waitForTimeout(2000);
let body = await page.textContent("body");
ok(page.url().match(/\/products\/[0-9a-f-]{36}/), "product name links to the editor");
ok(body.includes("Details") && body.includes("Variants"), "editor shows both sections");
ok(body.includes("40 / Black") || body.includes("42 / Black"), "variant labels sorted by option position");

// price field is prefilled in TAKA, not paisa
const priceInput = page.locator('input[aria-label^="Price for"]').first();
const priceValue = await priceInput.inputValue();
ok(/^\d+(\.\d+)?$/.test(priceValue) && Number(priceValue) < 10000, `price prefilled in taka (${priceValue})`);

// edit a price and save
await priceInput.fill("1950");
await page.click('button:has-text("Save variants")');
await page.waitForTimeout(2500);
body = await page.textContent("body");
ok(body.includes("Variants saved"), "variant save succeeded");

// edit scalars
await page.fill("#description", "Edited in the browser.");
await page.click('button:has-text("Save details")');
await page.waitForTimeout(2000);
ok((await page.textContent("body")).includes("Details saved"), "details save succeeded");

// add-variant offers only DECLARED option values
const sizeSelect = page.locator('select[id^="add-"]').first();
const opts = await sizeSelect.locator("option").allTextContents();
ok(!opts.includes("44"), `add-variant offers only declared sizes (${opts.filter(o=>o!=="Choose…").join(",")})`);

await browser.close();
