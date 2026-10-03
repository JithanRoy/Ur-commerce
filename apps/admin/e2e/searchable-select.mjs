import { chromium } from "playwright";

const B = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@demo.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "password123";
const SHOT = process.env.SELECT_SHOT;
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};

const login = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then((r) => r.json());
const AUTH = { ...H, Authorization: `Bearer ${login.data.accessToken}` };
const product = await fetch(`${API}/admin/products?limit=1`, { headers: AUTH })
  .then((r) => r.json())
  .then((j) => j.data.items[0]);
const brands = await fetch(`${API}/admin/brands?limit=100`, { headers: AUTH })
  .then((r) => r.json())
  .then((j) => j.data.items);
const target = brands.find((b) => b.id !== product.brandId) ?? brands[0];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

try {
  await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await page.goto(`${B}/products/${product.id}`, { waitUntil: "domcontentloaded" });

  const trigger = page.locator('button[data-slot="select"][aria-haspopup="listbox"]').nth(1);
  await trigger.waitFor();
  ok((await page.locator('button[data-slot="select"][aria-haspopup="listbox"]').count()) >= 2, "category and brand render as searchable dropdowns");

  await trigger.click();
  const search = page.getByRole("combobox", { name: /^Search/ });
  await search.waitFor();
  ok(await search.evaluate((el) => el === document.activeElement), "search box is focused on open");
  const allCount = await page.getByRole("option").count();
  await search.fill(target.name.slice(0, 4));
  const filtered = await page.getByRole("option").count();
  ok(filtered < allCount, `typing filters the list (${allCount} → ${filtered})`);
  ok((await page.getByRole("option", { name: /Create new/ }).count()) === 1, "“Create new” stays visible while filtering");

  if (SHOT) await page.screenshot({ path: SHOT });

  await search.fill(target.name);
  await search.press("Enter");
  ok(!(await search.isVisible().catch(() => false)), "Enter picks the highlighted option and closes");
  ok((await trigger.textContent()).includes(target.name), `trigger shows the chosen brand (${target.name})`);
  ok(await trigger.evaluate((el) => el === document.activeElement), "focus returns to the trigger");

  await trigger.press("ArrowDown");
  await page.getByRole("combobox", { name: /^Search/ }).waitFor();
  await page.keyboard.press("Escape");
  ok(!(await page.getByRole("combobox", { name: /^Search/ }).isVisible().catch(() => false)), "Escape closes the list");

  await trigger.click();
  await page.getByRole("combobox", { name: /^Search/ }).fill("zzzz-no-match");
  ok((await page.getByText(/No brand matches/).count()) === 1, "empty state shown when nothing matches");
  await page.mouse.click(5, 5);
  ok(!(await page.getByRole("combobox", { name: /^Search/ }).isVisible().catch(() => false)), "clicking outside closes the list");

  const hiddenBrand = page.locator("select").filter({ hasText: "No brand" }).first();
  await hiddenBrand.selectOption({ label: "No brand" });
  ok((await trigger.textContent()).includes("No brand"), "driving the hidden native select updates the dropdown (older tests keep working)");

  const statusSelect = page.locator("select#status");
  ok((await statusSelect.count()) === 1, "selects without the prop stay native");

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
} finally {
  await browser.close();
}

const after = await fetch(`${API}/admin/products/${product.id}`, { headers: AUTH })
  .then((r) => r.json())
  .then((j) => j.data);
ok(after.brandId === product.brandId, "product left unsaved and unchanged");

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
