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
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  await page.waitForTimeout(800);
  return { ctx, page };
}

const stored = (page) =>
  page.evaluate(() => ({
    local: localStorage.getItem("storefront-auth"),
    session: sessionStorage.getItem("storefront-auth"),
  }));

const hasSession = (s) => {
  const raw = s.local ?? s.session;
  if (!raw) return false;
  try {
    return Boolean(JSON.parse(raw).state?.session);
  } catch {
    return false;
  }
};

// signed out → menu is a plain link, no Sign out offered
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const body = await page.textContent("body");
  ok(!body.includes("Sign out"), "signed out: no Sign out in the header");
  await ctx.close();
}

// remembered session → sign out clears it
{
  const { ctx, page } = await signIn(true);
  ok(hasSession(await stored(page)), "signed in: session stored");

  await page.click('button[aria-label="Your account"]');
  await page.waitForTimeout(400);
  ok(await page.getByRole("menuitem", { name: "Sign out", exact: true }).isVisible(),
     "account menu offers Sign out");
  ok(await page.getByRole("menuitem", { name: "Your orders" }).isVisible(),
     "account menu links to orders");

  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await page.waitForTimeout(2500);

  const after = await stored(page);
  ok(!hasSession(after), `session cleared from storage (${JSON.stringify(after)})`);
  ok(new URL(page.url()).pathname === "/", `redirected home (got ${new URL(page.url()).pathname})`);

  const body = await page.textContent("body");
  ok(!body.includes("Sign out"), "header returns to signed-out state");

  await page.goto(B + "/account/orders", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const guarded = await page.textContent("body");
  ok(guarded.includes("Sign in"), "orders page is guarded again after sign out");
  await ctx.close();
}

// non-remembered session → sign out clears sessionStorage too
{
  const { ctx, page } = await signIn(false);
  const before = await stored(page);
  ok(before.session !== null && before.local === null, "signed in to sessionStorage");

  await page.click('button[aria-label="Your account"]');
  await page.waitForTimeout(400);
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await page.waitForTimeout(2500);

  const after = await stored(page);
  ok(!hasSession(after), `sessionStorage session cleared (${JSON.stringify(after)})`);
  await ctx.close();
}

await browser.close();
