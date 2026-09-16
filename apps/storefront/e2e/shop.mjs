import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

await page.goto(B + "/shop", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
let body = await page.textContent("body");
ok(body.includes("Classic Cotton Panjabi") && body.includes("Slim Fit Denim Shirt"), "shop lists both products");
ok(body.includes("2 products"), "shows total count");
ok(/৳[\d,]+/.test(body), "prices render with ৳");

await page.click('text=Price: low to high');
await page.waitForTimeout(1000);
ok(page.url().includes("sort=price-asc"), `sort is in the URL (${new URL(page.url()).search})`);

await page.goto(B + "/shop?inStock=true", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
ok((await page.textContent("body")).includes("Slim Fit"), "inStock filter applies from a bare URL");

await page.goto(B + "/product/slim-fit-denim-shirt", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
body = await page.textContent("body");
ok(body.includes("Select Size and Colour"), "button prompts for full selection");
ok(/৳2,499\s*–\s*৳2,599/.test(body.replace(/\s+/g," ")), "shows price RANGE before selection");

const addBtn = page.locator('button', { hasText: /Add to cart|Select |Sold out/ }).first();
ok(await addBtn.isDisabled(), "add to cart disabled before selection");

await page.click('button[aria-pressed]:has-text("M")');
await page.waitForTimeout(300);
await page.click('button[aria-pressed]:has-text("Indigo")');
await page.waitForTimeout(700);
body = await page.textContent("body");
ok(body.includes("DEN-IND-M"), "resolves to the correct SKU");
ok(!(await addBtn.isDisabled()), "add to cart enabled after full selection");

await page.click('button[aria-pressed]:has-text("L")');
await page.waitForTimeout(300);
await page.click('button[aria-pressed]:has-text("Black")');
await page.waitForTimeout(700);
body = await page.textContent("body");
ok(body.includes("Sold out"), "sold-out combination shows Sold out");
ok(await addBtn.isDisabled(), "add to cart disabled when sold out");
ok(body.includes("DEN-BLK-L"), "sold-out variant still resolves (disabled, not hidden)");

await browser.close();
