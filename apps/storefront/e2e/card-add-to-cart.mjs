import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

await page.goto(B + "/shop", { waitUntil: "load" });
const cards = page.locator('a[href^="/product/"]');
await cards.first().waitFor();
ok((await cards.count()) > 0, "shop grid renders product cards");

const addButtons = page.getByRole("button", { name: "Add to cart" });
ok((await addButtons.count()) > 0, "cards offer Add to cart");

const multiCard = page.locator("div.group").filter({ hasText: /options available/ }).first();
if ((await multiCard.count()) > 0) {
  await multiCard.getByRole("button", { name: "Add to cart" }).click();
  const dialog = page.getByRole("dialog");
  ok(await dialog.waitFor({ timeout: 8000 }).then(() => true).catch(() => false),
     "multi-variant Add to cart opens the variant dialog instead of adding blindly");
  ok(new URL(page.url()).pathname === "/shop", "stays on the shop page");
  await page.keyboard.press("Escape");
}

const soldOutAdds = page
  .locator("div.group")
  .filter({ hasText: "Out of stock" })
  .getByRole("button", { name: "Add to cart" });
ok((await soldOutAdds.count()) === 0, "sold-out products never show Add to cart");

await browser.close();
