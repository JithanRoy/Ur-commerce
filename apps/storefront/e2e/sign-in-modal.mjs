import { chromium } from "playwright";

const B = "http://localhost:3100";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(B + "/", { waitUntil: "load" });
await page.waitForTimeout(3000);

await page.getByRole("button", { name: "Buy now" }).first().click();
await page.waitForTimeout(800);

const dialog = page.getByRole("dialog");
ok(await dialog.isVisible(), "guest Buy now opens the dialog");

// the fields themselves are in the modal now
const email = dialog.locator('input[type="email"]');
const password = dialog.locator('input[type="password"]');
ok((await email.count()) === 1, "modal has an email input");
ok((await password.count()) === 1, "modal has a password input");
ok((await dialog.getByRole("button", { name: "Sign in" }).count()) === 1,
   "modal has a Sign in submit button");

// password visibility toggle
const toggle = dialog.getByRole("button", { name: "Show password" });
ok((await toggle.count()) === 1, "password field has a Show password control");
await password.fill("secret123");
await toggle.click();
await page.waitForTimeout(300);
const revealed = await dialog.locator('input[name="password"]').getAttribute("type");
ok(revealed === "text", `toggle reveals the password (type=${revealed})`);
ok((await dialog.getByRole("button", { name: "Hide password" }).count()) === 1,
   "control flips to Hide password");
await dialog.getByRole("button", { name: "Hide password" }).click();
await page.waitForTimeout(300);
ok((await dialog.locator('input[name="password"]').getAttribute("type")) === "password",
   "toggle hides it again");

// wrong credentials stay in the modal
await email.fill("shopper@demo.local");
await dialog.locator('input[name="password"]').fill("wrong-password");
await dialog.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(3000);
ok(await page.getByRole("dialog").isVisible(), "bad credentials keep the modal open");
ok((await dialog.getByRole("alert").count()) > 0, "bad credentials show an error");

// correct credentials sign in and continue
await dialog.locator('input[name="password"]').fill("password123");
await dialog.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/checkout/, { timeout: 20000 }).catch(() => {});
ok(new URL(page.url()).pathname === "/checkout",
   `signing in from the modal continues to checkout (${new URL(page.url()).pathname})`);
ok(!(await page.getByRole("dialog").isVisible().catch(() => false)),
   "modal closes after signing in");

const stored = await page.evaluate(() => ({
  local: localStorage.getItem("storefront-auth") !== null,
  session: sessionStorage.getItem("storefront-auth") !== null,
}));
ok(stored.local || stored.session, `session persisted (${JSON.stringify(stored)})`);

await ctx.close();
await browser.close();
