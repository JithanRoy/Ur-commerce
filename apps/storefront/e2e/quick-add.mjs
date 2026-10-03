import { chromium } from "playwright";

const B = "http://localhost:3100";
const API = "http://localhost:3002/api/v1";
const H = { "X-Tenant-Host": "demo.localhost" };
const SHOT = process.env.QUICK_ADD_SHOT;
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};
const taka = (paisa) => `৳${(paisa / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 860 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

try {
  await page.goto(B + "/shop", { waitUntil: "load" });
  const card = page
    .locator("div.group")
    .filter({ hasText: /options available/ })
    .first();
  await card.waitFor();
  const href = await card.locator('a[href^="/product/"]').first().getAttribute("href");
  const slug = href.replace("/product/", "");
  const detail = await fetch(`${API}/products/${slug}`, { headers: H }).then((r) => r.json()).then((j) => j.data);
  const inStock = detail.variants.filter((v) => v.stock > 0);
  const cheapest = inStock.reduce((a, v) => (v.price < a.price ? v : a));

  const cardText = await card.textContent();
  ok(!/৳[\d,.]+\s*[–-]\s*৳/.test(cardText), "card shows one price, not a range");
  ok(cardText.includes(taka(cheapest.price)), `card shows the lowest price ${taka(cheapest.price)}`);

  const addButton = card.getByRole("button", { name: "Add to cart" });
  ok((await addButton.locator("svg").count()) > 0, "Add to cart button has a cart icon");
  await addButton.click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  ok(new URL(page.url()).pathname === "/shop", "stays on the shop page");
  const radios = dialog.getByRole("radio");
  await radios.first().waitFor();
  ok((await radios.count()) === detail.variants.length, `lists all ${detail.variants.length} variants`);
  ok(
    (await radios.filter({ has: page.locator(":scope:checked") }).count()) <= 1 &&
      (await dialog.getByRole("radio", { checked: true }).count()) === 1,
    "one variant preselected",
  );
  const preselectedPrice = await dialog.locator("h2 + p span").first().textContent();
  ok(preselectedPrice === taka(cheapest.price), `preselects the cheapest in-stock variant (${preselectedPrice})`);

  const other = inStock.find((v) => v.id !== cheapest.id) ?? cheapest;
  await dialog.locator(`input[value="${other.id}"]`).check();
  if (other.stock > 1) await dialog.getByRole("button", { name: "Increase quantity" }).click();
  const quantity = other.stock > 1 ? 2 : 1;

  if (SHOT) await page.screenshot({ path: SHOT });

  await dialog.getByRole("button", { name: "Add to cart" }).click();
  await dialog.getByText("Added to your cart").waitFor({ timeout: 15000 });
  await page
    .waitForFunction(
      (n) => document.querySelector('a[href="/cart"] span')?.textContent === String(n),
      quantity,
      { timeout: 12000 },
    )
    .catch(() => {});
  const badge = await page.evaluate(() => document.querySelector('a[href="/cart"] span')?.textContent ?? null);
  ok(badge === String(quantity), `cart badge shows ${quantity} (got ${badge})`);

  await page.keyboard.press("Escape");
  ok(!(await dialog.isVisible().catch(() => false)), "Escape closes the dialog");
  ok(
    await page.evaluate(() => document.activeElement?.textContent?.includes("Add")),
    "focus returns to the card button",
  );

  await page.goto(B + "/cart", { waitUntil: "load" });
  const sku = other.optionValues.map((o) => o.optionValue.value);
  await page.getByRole("button", { name: /Remove/i }).first().waitFor({ timeout: 15000 });
  const cartText = await page.locator("body").innerText();
  ok(sku.every((value) => cartText.includes(value)), `cart holds the chosen variant (${sku.join(" / ")})`);

  const remove = page.getByRole("button", { name: /Remove/i });
  while ((await remove.count()) > 0) {
    await remove.first().click();
    await page.waitForTimeout(800);
  }

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
