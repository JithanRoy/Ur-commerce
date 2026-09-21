import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

// signed OUT → prompted to sign in
let ctx = await browser.newContext();
let page = await ctx.newPage();
await page.goto(B + "/account/addresses", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
let body = await page.textContent("body");
ok(page.url().includes("/account/addresses"), "route exists (no 404)");
ok(body.includes("Sign in to manage your addresses"), "signed out: prompted to sign in");
ok(!body.includes("see your orders"), "prompt copy is address-specific");
await ctx.close();

// signed IN
ctx = await browser.newContext();
page = await ctx.newPage();
await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.fill("#email", "shopper@demo.local");
await page.fill("#password", "password123");
await page.click("button[type=submit]");
await page.waitForTimeout(3000);

await page.goto(B + "/account/addresses", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
body = await page.textContent("body");
const startedEmpty = body.includes("No saved addresses");
ok(startedEmpty || body.includes("Add another address"), "address book renders");

// open the create form
if (startedEmpty) {
  await page.click("text=Add an address");
} else {
  await page.click("text=Add another address");
}
await page.waitForTimeout(600);

// validation fires before hitting the API
await page.fill("#fullName", "R");
await page.fill("#phone", "12345");
await page.fill("#thana", "Gulshan");
await page.fill("#addressLine", "House 42, Road 11");
await page.click("button[type=submit]");
await page.waitForTimeout(600);
body = await page.textContent("body");
ok(body.includes("Enter at least 2 characters"), "rejects 1-char name client-side");
ok(body.includes("Enter an 11-digit number starting 01"), "rejects malformed phone");

// a real address saves
const stamp = Date.now().toString().slice(-6);
await page.fill("#fullName", "E2E Tester");
await page.fill("#phone", "01712345678");
await page.fill("#area", "Gulshan 2");
await page.fill("#label", `E2E-${stamp}`);
await page.click("button[type=submit]");
await page.waitForTimeout(2500);
body = await page.textContent("body");
ok(body.includes("E2E Tester"), "new address appears in the list");
ok(body.includes(`E2E-${stamp}`), "label rendered");
ok(body.includes("Gulshan 2"), "optional area saved");
ok(body.includes("01712345678"), "phone rendered");

const cardCount = await page.locator("li:has-text('E2E Tester')").count();
ok(cardCount === 1, "saved exactly one address");

// edit it
await page
  .locator("li")
  .filter({ hasText: "E2E Tester" })
  .getByRole("button", { name: "Edit" })
  .click();
await page.waitForTimeout(600);
const prefilled = await page.inputValue("#fullName");
ok(prefilled === "E2E Tester", "edit form pre-filled from the address");
await page.fill("#fullName", "E2E Renamed");
await page.click("button[type=submit]");
await page.waitForTimeout(2500);
body = await page.textContent("body");
ok(body.includes("E2E Renamed") && !body.includes("E2E Tester"), "edit persisted");

// making an address default demotes the previous one
const defaultCards = await page.locator("li:has-text('Default')").count();
if (defaultCards > 0) {
  const target = page.locator("li").filter({ hasText: "E2E Renamed" });
  const canPromote = await target
    .getByRole("button", { name: "Make default" })
    .count();
  if (canPromote > 0) {
    const defaultBadge = page.locator("span:text-is('Default')");
    await target.getByRole("button", { name: "Make default" }).click();
    await page
      .locator("li")
      .filter({ hasText: "E2E Renamed" })
      .filter({ has: defaultBadge })
      .waitFor({ timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("span")].filter(
          (el) => el.textContent.trim() === "Default",
        ).length === 1,
      undefined,
      { timeout: 10000 },
    );
    const promoted = await page
      .locator("li")
      .filter({ hasText: "E2E Renamed" })
      .filter({ has: defaultBadge })
      .count();
    ok(promoted === 1, "make default promotes the address");
    ok(
      (await page.locator("li").filter({ has: defaultBadge }).count()) === 1,
      "exactly one default remains",
    );
  }
}

// delete needs confirmation
const row = page.locator("li").filter({ hasText: "E2E Renamed" });
await row.getByRole("button", { name: "Remove", exact: true }).first().click();
await page.waitForTimeout(500);
body = await page.textContent("body");
ok(body.includes("Remove this address?"), "delete asks for confirmation");
await page.click("text=Keep");
await page.waitForTimeout(500);
body = await page.textContent("body");
ok(body.includes("E2E Renamed"), "cancelling keeps the address");

await row.getByRole("button", { name: "Remove", exact: true }).first().click();
await page.waitForTimeout(500);
await row.getByRole("button", { name: "Remove", exact: true }).last().click();
await page.waitForTimeout(2500);
body = await page.textContent("body");
ok(!body.includes("E2E Renamed"), "address removed");

await browser.close();
