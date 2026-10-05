import { chromium } from "playwright";

const ADMIN = "http://localhost:5273";
const SHOP = "http://localhost:3100";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@demo.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "password123";
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};

const login = await fetch(`${API}/auth/login`, { method: "POST", headers: H, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) }).then((r) => r.json());
const AUTH = { ...H, Authorization: `Bearer ${login.data.accessToken}` };
const settings = () => fetch(`${API}/admin/settings`, { headers: AUTH }).then((r) => r.json()).then((j) => j.data);
const original = (await settings()).brandsEnabled;
const branded = await fetch(`${API}/products?limit=100`, { headers: H }).then((r) => r.json()).then((j) => j.data.items.find((p) => p.brand));

const browser = await chromium.launch();
const admin = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
const shop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
for (const page of [admin, shop]) page.on("pageerror", (e) => errors.push(e.message));

async function setBrands(enabled) {
  await admin.goto(`${ADMIN}/branding`, { waitUntil: "domcontentloaded" });
  const box = admin.getByLabel("Show brands on the storefront");
  await box.waitFor();
  if ((await box.isChecked()) !== enabled) await box.setChecked(enabled);
  await admin.getByRole("button", { name: /Save/ }).first().click();
  await admin.getByText("Branding saved").first().waitFor();
}

try {
  await admin.goto(`${ADMIN}/login`, { waitUntil: "domcontentloaded" });
  await admin.fill("#email", EMAIL);
  await admin.fill("#password", PASSWORD);
  await admin.getByRole("button", { name: "Sign in", exact: true }).click();
  await admin.waitForURL((url) => !url.pathname.startsWith("/login"));

  await setBrands(false);
  ok((await settings()).brandsEnabled === false, "admin saves brands off");

  await shop.goto(SHOP, { waitUntil: "networkidle" });
  const header = shop.locator("header").first();
  ok((await header.getByRole("link", { name: "Brands" }).count()) === 0, "header drops the Brands link");
  ok((await shop.locator("footer").getByRole("link", { name: "Brands" }).count()) === 0, "footer drops the Brands link");
  ok((await shop.getByRole("link", { name: "Browse brands" }).count()) === 0, "hero drops “Browse brands”");
  ok((await shop.getByRole("heading", { name: /Shop by Brand/i }).count()) === 0, "home has no brand strip");
  await shop.goto(`${SHOP}/brand`, { waitUntil: "networkidle" });
  ok(await shop.getByRole("heading", { name: "Page not found" }).isVisible(), "/brand shows Page not found");
  await shop.goto(`${SHOP}/shop`, { waitUntil: "networkidle" });
  ok((await shop.getByText("Brand", { exact: true }).count()) === 0, "shop has no brand filter");
  if (branded) {
    await shop.goto(`${SHOP}/product/${branded.slug}`, { waitUntil: "networkidle" });
    ok((await shop.getByRole("link", { name: branded.brand.name, exact: true }).count()) === 0, "product page hides the brand name");
  }

  await setBrands(true);
  await shop.goto(SHOP, { waitUntil: "networkidle" });
  ok((await shop.locator("header").first().getByRole("link", { name: "Brands" }).count()) === 1, "switching back restores the Brands link");

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
} finally {
  await browser.close();
  await fetch(`${API}/admin/settings`, { method: "PATCH", headers: AUTH, body: JSON.stringify({ brandsEnabled: original }) });
  ok((await settings()).brandsEnabled === original, `brands setting restored to ${original}`);
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
