import { chromium } from "playwright";
const B = "http://localhost:5273";
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
await page.fill("#email", "admin@demo.local");
await page.fill("#password", "password123");
await page.click("button[type=submit]");
await page.waitForTimeout(3000);

// create form exposes both fields
await page.goto(B + "/products/new", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
let body = await page.textContent("body");
ok(body.includes("Category"), "create form has a Category field");
ok(body.includes("Brand"), "create form has a Brand field");

const catOptions = await page
  .locator("select")
  .filter({ hasText: "Uncategorised" })
  .locator("option")
  .allTextContents();
ok(catOptions.length > 1, `category list populated (${catOptions.length - 1} real)`);
ok(catOptions.includes("Uncategorised"), "offers an explicit empty choice");

const brandOptions = await page
  .locator("select")
  .filter({ hasText: "No brand" })
  .locator("option")
  .allTextContents();
ok(brandOptions.length > 1, `brand list populated (${brandOptions.length - 1} real)`);

// edit form: set a category and brand, and have it persist
await page.goto(B + "/products", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page
  .locator('a[href^="/products/"]')
  .filter({ hasNotText: "New product" })
  .first()
  .click();
await page.waitForTimeout(3000);

body = await page.textContent("body");
ok(body.includes("Category"), "edit form has a Category field");

const categorySelect = page
  .locator("select")
  .filter({ hasText: "Uncategorised" })
  .first();
const brandSelect = page.locator("select").filter({ hasText: "No brand" }).first();

const targetCategory = (await categorySelect.locator("option").allTextContents())
  .filter((t) => t !== "Uncategorised")[0];
const targetBrand = (await brandSelect.locator("option").allTextContents())
  .filter((t) => t !== "No brand")[0];

await categorySelect.selectOption({ label: targetCategory });
await brandSelect.selectOption({ label: targetBrand });
await page.click('button:has-text("Save details")');
await page.waitForTimeout(2500);

body = await page.textContent("body");
ok(body.includes("Details saved"), "save succeeded");

// reload — the value must come back from the server, not local state
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const persistedCategory = await page
  .locator("select")
  .filter({ hasText: "Uncategorised" })
  .first()
  .evaluate((el) => el.options[el.selectedIndex]?.text ?? "");
const persistedBrand = await page
  .locator("select")
  .filter({ hasText: "No brand" })
  .first()
  .evaluate((el) => el.options[el.selectedIndex]?.text ?? "");

ok(persistedCategory === targetCategory, `category persisted (${persistedCategory})`);
ok(persistedBrand === targetBrand, `brand persisted (${persistedBrand})`);

// clearing back to none must also persist
await page
  .locator("select")
  .filter({ hasText: "Uncategorised" })
  .first()
  .selectOption({ label: "Uncategorised" });
await page.click('button:has-text("Save details")');
await page.waitForTimeout(2500);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const cleared = await page
  .locator("select")
  .filter({ hasText: "Uncategorised" })
  .first()
  .evaluate((el) => el.options[el.selectedIndex]?.text ?? "");
ok(cleared === "Uncategorised", "clearing the category persists");

await browser.close();
