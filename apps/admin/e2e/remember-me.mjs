import { chromium } from "playwright";
const B = "http://localhost:5273";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const EMAIL = "admin@demo.local";
const PASSWORD = "password123";

async function signIn(remember) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  const box = page.getByRole("checkbox");
  if ((await box.isChecked()) !== remember) await box.click();
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  return { ctx, page };
}

const checked = await (async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
  const v = await page.getByRole("checkbox").isChecked();
  await ctx.close();
  return v;
})();
ok(checked === true, "remember-me defaults to checked");

const remembered = await signIn(true);
const whereRemembered = await remembered.page.evaluate(() => ({
  local: localStorage.getItem("admin-auth") !== null,
  session: sessionStorage.getItem("admin-auth") !== null,
}));
ok(whereRemembered.local && !whereRemembered.session,
   `remember=true → localStorage only (${JSON.stringify(whereRemembered)})`);
await remembered.ctx.close();

const transient = await signIn(false);
const whereTransient = await transient.page.evaluate(() => ({
  local: localStorage.getItem("admin-auth") !== null,
  session: sessionStorage.getItem("admin-auth") !== null,
}));
ok(!whereTransient.local && whereTransient.session,
   `remember=false → sessionStorage only (${JSON.stringify(whereTransient)})`);

const tokenRefreshTarget = await transient.page.evaluate(() => {
  const raw = sessionStorage.getItem("admin-auth");
  return raw ? JSON.parse(raw).state.session.accessToken.slice(0, 12) : null;
});
ok(tokenRefreshTarget !== null, "session token readable from sessionStorage");

await transient.page.goto(B + "/products", { waitUntil: "domcontentloaded" });
await transient.page.waitForTimeout(2500);
ok(!new URL(transient.page.url()).pathname.startsWith("/login"),
   "sessionStorage session survives navigation in the same tab");

const stillSession = await transient.page.evaluate(() => ({
  local: localStorage.getItem("admin-auth") !== null,
  session: sessionStorage.getItem("admin-auth") !== null,
}));
ok(!stillSession.local && stillSession.session,
   `writes stay in sessionStorage after use (${JSON.stringify(stillSession)})`);
await transient.ctx.close();

await browser.close();
