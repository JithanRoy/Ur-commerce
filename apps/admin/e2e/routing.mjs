import { chromium } from "playwright";

const B = "http://localhost:5273";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

async function go(ctx, path) {
  const page = await ctx.newPage();
  await page.goto(B + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  return page;
}

// --- signed OUT ---
let ctx = await browser.newContext();
for (const path of ["/products", "/categories", "/brands", "/collections", "/products/new", "/dashboard", "/totally-made-up", "/"]) {
  const page = await go(ctx, path);
  const url = new URL(page.url());
  ok(url.pathname === "/login", `signed out: ${path} → /login (got ${url.pathname})`);
  await page.close();
}

// --- sign in, then check ---
const page = await go(ctx, "/login");
await page.fill('input#email', "admin@demo.local");
await page.fill('input#password', "password123");
await page.click('button[type=submit]');
await page.waitForURL(/\/products/, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1200);
ok(new URL(page.url()).pathname === "/products", `login lands on /products (got ${new URL(page.url()).pathname})`);

// signed in: /login should bounce away
await page.goto(B + "/login", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
ok(new URL(page.url()).pathname === "/products", `signed in: /login → /products (got ${new URL(page.url()).pathname})`);

// signed in: unknown URL shows 404 page, not a redirect
await page.goto(B + "/nope-not-real", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const body = await page.textContent("body");
ok(body.includes("Page not found"), "signed in: unknown URL shows 404 page");
ok(new URL(page.url()).pathname === "/nope-not-real", "404 keeps the URL (no silent redirect)");

// signed in: real modules render
for (const p of ["/categories", "/brands", "/collections"]) {
  await page.goto(B + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  ok(new URL(page.url()).pathname === p, `signed in: ${p} renders`);
}
await browser.close();
