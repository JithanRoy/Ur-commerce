import { chromium } from "playwright";

const B = "http://localhost:3100";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const badge = (page) =>
  page.evaluate(() => {
    const link = document.querySelector("[data-cart-trigger]");
    const span = link?.querySelector("[data-cart-count]");
    return {
      label: link?.getAttribute("aria-label") ?? null,
      text: span?.textContent?.trim() ?? null,
    };
  });

async function addFromCard(page, button) {
  await button.click();
  const dialog = page.getByRole("dialog");
  if (await dialog.waitFor({ timeout: 3000 }).then(() => true).catch(() => false)) {
    await dialog.getByRole("button", { name: "Add to cart" }).click();
    await dialog.getByText("Added to your cart").waitFor({ timeout: 12000 });
    await page.keyboard.press("Escape");
  }
}

const page = await (await browser.newContext()).newPage();
await page.goto(B + "/", { waitUntil: "load" });
await page.waitForTimeout(3000);

const empty = await badge(page);
ok(empty.text === null, `no badge on an empty cart (got ${empty.text})`);
ok(/empty/i.test(empty.label ?? ""), `empty state announced (${empty.label})`);

const addBtn = page.getByRole("button", { name: "Add to cart" }).first();
ok((await addBtn.count()) > 0, "home card offers Add to cart");
await addFromCard(page, addBtn);

await page
  .waitForFunction(
    () => document.querySelector("[data-cart-count]")?.textContent === "1",
    undefined,
    { timeout: 12000 },
  )
  .then(() => true)
  .catch(() => false);

const afterOne = await badge(page);
ok(afterOne.text === "1", `badge shows 1 after adding (got ${afterOne.text})`);
ok(/1 item$/i.test(afterOne.label ?? ""), `singular reads correctly (${afterOne.label})`);

// add the same product again — badge must increment, not stay at 1
await addFromCard(page, page.getByRole("button", { name: /Add to cart|Added/ }).first());
await page
  .waitForFunction(
    () => document.querySelector("[data-cart-count]")?.textContent === "2",
    undefined,
    { timeout: 12000 },
  )
  .then(() => true)
  .catch(() => false);

const afterTwo = await badge(page);
ok(afterTwo.text === "2", `badge increments to 2 (got ${afterTwo.text})`);

// survives a hard navigation
await page.goto(B + "/shop", { waitUntil: "load" });
await page.waitForTimeout(2500);
const onShop = await badge(page);
ok(onShop.text === "2", `badge persists across navigation (got ${onShop.text})`);

// reflects removal made on the cart page
await page.goto(B + "/cart", { waitUntil: "load" });
await page.waitForTimeout(2500);
const removeBtn = page.getByRole("button", { name: /Remove/i }).first();
if ((await removeBtn.count()) > 0) {
  await removeBtn.click();
  await page
    .waitForFunction(
      () => !document.querySelector("[data-cart-count]"),
      undefined,
      { timeout: 12000 },
    )
    .then(() => true)
    .catch(() => false);
  const cleared = await badge(page);
  ok(cleared.text === null, `badge clears when cart empties (got ${cleared.text})`);
}

await browser.close();
