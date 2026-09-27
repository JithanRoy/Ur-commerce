import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
const page = await ctx.newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

await page.goto(B + "/product/slim-fit-denim-shirt", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2200);

// gallery
const thumbs = await page.locator('button[aria-label^="View image"]').count();
ok(
  thumbs === 0 || thumbs >= 2,
  `thumbnail rail only appears with 2+ usable images (${thumbs})`,
);
const mainImg = page.locator("img").first();
ok(await mainImg.isVisible(), "a main image renders");

// info column
let body = await page.innerText("body");
ok(body.includes("Cash on delivery"), "delivery reassurance shown");
ok(body.includes("Free shipping on orders over"), "free shipping stated");
ok(body.includes("7-day exchange"), "exchange policy stated");

// price is a range before selection, exact after
ok(/৳[\d,]+\s*–\s*৳[\d,]+/.test(body), "shows a price RANGE before selection");
ok(
  await page.locator('button:has-text("Select")').count() > 0,
  "buy button asks for a selection first",
);

await page.click('button[aria-pressed]:has-text("M")');
await page.waitForTimeout(250);
await page.click('button[aria-pressed]:has-text("Indigo")');
await page.waitForTimeout(900);

body = await page.innerText("body");
ok(!/৳[\d,]+\s*–\s*৳[\d,]+/.test(body), "range replaced by one price");
ok(body.includes("In stock"), "stock state shown once resolved");
ok(body.includes("DEN-IND-M"), "SKU resolves to the chosen variant");
ok(
  await page.locator('button:has-text("Add to cart")').isEnabled(),
  "add to cart enabled after a full selection",
);

// broken images must not leave an empty frame
const brokenFrames = await page.evaluate(() =>
  [...document.querySelectorAll("img")].filter(
    (el) => el.complete && el.naturalWidth === 0,
  ).length,
);
ok(brokenFrames === 0, "no broken images rendered");

// add to cart -> cart page
await page.click('button:has-text("Add to cart")');
await page.waitForURL(/\/cart/, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(2500);

body = await page.innerText("body");
ok(page.url().includes("/cart"), "adding navigates to the cart");
ok(body.includes("Slim Fit Denim Shirt"), "cart shows the product");
ok(body.includes("M") && body.includes("Indigo"), "cart shows the options");

// free shipping meter
const meter = page.locator('[role="progressbar"]');
ok((await meter.count()) === 1, "free shipping meter rendered");
const pct = await meter.getAttribute("aria-valuenow");
ok(pct !== null && Number(pct) > 0, `meter reports progress (${pct}%)`);
const meterText = await page
  .locator('[role="progressbar"]')
  .locator("xpath=..")
  .innerText();
ok(
  /free shipping|ships free/i.test(meterText),
  `meter explains the threshold ("${meterText.split("\n")[0].trim()}")`,
);

// quantity control updates the line total
const quantityText = () =>
  page
    .locator("li")
    .filter({ hasText: "Slim Fit Denim Shirt" })
    .innerText()
    .then((t) => t.replace(/\s+/g, " ").trim());

const before = await quantityText();
const plus = page.locator('button[aria-label="Increase quantity"]').first();
await plus.waitFor({ state: "visible", timeout: 10000 });
await plus.click();
await page
  .waitForFunction(
    (prev) => {
      const row = [...document.querySelectorAll("li")].find((el) =>
        el.innerText.includes("Slim Fit Denim Shirt"),
      );
      return row && row.innerText.replace(/\s+/g, " ").trim() !== prev;
    },
    before,
    { timeout: 15000 },
  )
  .then(() => true)
  .catch(() => false);
const after = await quantityText();

ok(before !== after, "quantity change updates the row");
ok(/৳4,998/.test(after), `line total recalculated (${after.match(/৳[\d,]+/g)?.join(" ")})`);
ok(/each/.test(after), "unit price shown once quantity exceeds 1");

// remove restores the empty state
await page.locator('button[aria-label^="Remove"]').first().click();
await page
  .waitForFunction(() => document.body.innerText.includes("Your cart is empty"), undefined, { timeout: 15000 })
  .then(() => true)
  .catch(() => false);
ok(
  (await page.innerText("body")).includes("Your cart is empty"),
  "removing the last line shows the empty state",
);

await browser.close();
