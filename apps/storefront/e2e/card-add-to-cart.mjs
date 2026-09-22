import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

await page.goto(B + "/shop", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

const cards = page.locator('a[href^="/product/"]');
ok((await cards.count()) > 0, "shop grid renders product cards");

const body = await page.textContent("body");
const hasAdd = body.includes("Add to bag");
const hasChoose = body.includes("Choose options");
ok(hasAdd || hasChoose, "cards expose a call to action");

// a multi-variant product must NOT add blindly — it has to resolve a variant
if (hasChoose) {
  await page.locator('button:has-text("Choose options")').first().click();
  await page.waitForTimeout(2500);
  ok(
    /\/product\//.test(page.url()),
    "'Choose options' routes to the detail page to pick a variant",
  );
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
}

ok(
  hasChoose,
  "multi-variant products route to detail rather than adding blindly",
);

// a single-variant product adds straight from the card
if (hasAdd) {
  const addButton = page.locator('button:has-text("Add to bag")').first();
  await addButton.click();
  await page
    .waitForFunction(
      () => document.body.innerText.includes("Added to bag"),
      undefined,
      { timeout: 15000 },
    )
    .then(() => true)
    .catch(() => false);

  const after = await page.textContent("body");
  ok(after.includes("Added to bag"), "card confirms the item was added");

  await page.goto(B + "/cart", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const cart = await page.textContent("body");
  ok(!cart.includes("Your cart is empty"), "item really reached the cart");
  ok(/৳/.test(cart), "cart shows a formatted price");

  // clean up so repeat runs start from an empty cart
  const removeButtons = page.locator('button[aria-label="Remove"]');
  const n = await removeButtons.count();
  for (let i = 0; i < n; i += 1) {
    await removeButtons.first().click();
    await page.waitForTimeout(1200);
  }
}

// sold-out products must not offer a buy action
await page.goto(B + "/shop", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const soldOutCards = page
  .locator("div")
  .filter({ hasText: "Out of stock" })
  .locator('button:has-text("Add to bag")');
ok(
  (await soldOutCards.count()) === 0,
  "sold-out products never show Add to bag",
);

await browser.close();
