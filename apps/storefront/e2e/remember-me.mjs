import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

async function signIn(remember) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.fill("#email", "shopper@demo.local");
  await page.fill("#password", "password123");
  const box = page.getByRole("checkbox");
  if ((await box.isChecked()) !== remember) await box.click();
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  return { ctx, page };
}

const where = (page) =>
  page.evaluate(() => ({
    local: localStorage.getItem("storefront-auth") !== null,
    session: sessionStorage.getItem("storefront-auth") !== null,
  }));

const defaultChecked = await (async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const v = await page.getByRole("checkbox").isChecked();
  await ctx.close();
  return v;
})();
ok(defaultChecked === true, "remember-me defaults to checked");

const remembered = await signIn(true);
const a = await where(remembered.page);
ok(a.local && !a.session, `remember=true → localStorage only (${JSON.stringify(a)})`);
await remembered.ctx.close();

const transient = await signIn(false);
const b = await where(transient.page);
ok(!b.local && b.session, `remember=false → sessionStorage only (${JSON.stringify(b)})`);

await transient.page.goto(B + "/account", { waitUntil: "domcontentloaded" });
await transient.page.waitForTimeout(3000);
ok(!new URL(transient.page.url()).pathname.startsWith("/login"),
   "sessionStorage session survives navigation");

const c = await where(transient.page);
ok(!c.local && c.session, `writes stay in sessionStorage (${JSON.stringify(c)})`);
await transient.ctx.close();

await browser.close();
