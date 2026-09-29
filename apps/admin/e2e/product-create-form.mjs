import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { unlinkSync } from "node:fs";

const B = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);
const RUN = Math.floor(Math.random() * 90000) + 10000;

const files = ["/tmp/urc-f1.png", "/tmp/urc-f2.png"];
execSync(`python3 -c "
import struct,zlib
def chunk(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c))
for p in ['${files[0]}','${files[1]}']:
    png=b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(bytes([0,120,60,220])))+chunk(b'IEND',b'')
    open(p,'wb').write(png)
"`);

const token = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" },
  body: JSON.stringify({ email: "admin@demo.local", password: "password123" }),
}).then((r) => r.json()).then((j) => j.data.accessToken);
const auth = { Authorization: `Bearer ${token}`, "X-Tenant-Host": "demo.localhost" };

const page = await browser.newPage();
await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.fill("#email", "admin@demo.local");
await page.fill("#password", "password123");
await page.click('button[type=submit]');
await page.waitForTimeout(3500);

await page.goto(B + "/products/new", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

const body = await page.textContent("body");
ok(!body.includes("Image URL"), "URL input is gone");
ok(body.includes("Drag images here"), "uploader present instead");
for (const t of ["Basics", "Images", "Options", "Variants"]) {
  ok(body.includes(t), `section: ${t}`);
}

await page.fill("#name", `Form Test ${RUN}`);
await page.waitForTimeout(400);
ok((await page.inputValue("#slug")) === `form-test-${RUN}`, "slug fills from name");

const PREFIX = `FT${String(RUN).charAt(0)}`;
const skuPlaceholder = await page
  .locator('input[aria-label^="SKU"]')
  .first()
  .getAttribute("placeholder");
ok(skuPlaceholder === `${PREFIX}-STD`,
   `single variant auto-SKU placeholder (${skuPlaceholder})`);

// inline brand create
await page.locator("select").filter({ hasText: "No brand" }).selectOption("__create__");
await page.waitForTimeout(400);
const brandInput = page.getByLabel("New brand name");
ok(await brandInput.isVisible(), "choosing create-new reveals an inline input");
await brandInput.fill(`E2E Brand ${RUN}`);
await page.getByRole("button", { name: "Create brand" }).click();
await page.waitForTimeout(2500);
const brandSelect = page.locator("select").filter({ hasText: `E2E Brand ${RUN}` });
ok((await brandSelect.count()) === 1, "new brand is created and selected");

// upload two images
const chooser = page.waitForEvent("filechooser");
await page.getByRole("button", { name: "browse your files" }).click();
(await chooser).setFiles(files);
await page.waitForTimeout(6000);
const previews = await page.locator("form ul li img").count();
ok(previews === 2, `two images uploaded and previewed (${previews})`);

// options → variants with auto-SKUs
await page.getByRole("button", { name: /Add option/i }).click();
await page.waitForTimeout(300);
await page.getByLabel("Option 1 name").fill("Size");
await page.getByLabel("Option 1 values").fill("M, L");
await page.waitForTimeout(600);
const skuInputs = page.locator('input[aria-label^="SKU"]');
ok((await skuInputs.count()) === 2, "two variants generated");
const ph = await Promise.all([
  skuInputs.nth(0).getAttribute("placeholder"),
  skuInputs.nth(1).getAttribute("placeholder"),
]);
ok(ph[0] === `${PREFIX}-M` && ph[1] === `${PREFIX}-L`,
   `variant auto-SKUs include the option value (${ph.join(", ")})`);

// explicit SKUs: the backend keeps soft-deleted products' SKUs reserved
// forever (backend-requests.md §6), so auto-SKUs collide across reruns
for (const [i, price, sku] of [["0", "1500", `FT${RUN}-M`], ["1", "1600", `FT${RUN}-L`]]) {
  await skuInputs.nth(Number(i)).fill(sku);
  await page.locator('input[aria-label^="Price"]').nth(Number(i)).fill(price);
  await page.locator('input[aria-label^="Stock"]').nth(Number(i)).fill("5");
}

await page.getByRole("button", { name: "Create product" }).click();
await page.waitForURL(/\/products$/, { timeout: 20000 }).catch(() => {});
ok(new URL(page.url()).pathname === "/products", "create succeeds and returns to the list");

// verify server-side
const list = await fetch(`${API}/admin/products?limit=50`, { headers: auth })
  .then((r) => r.json());
const created = list.data.items.find((p) => p.slug === `form-test-${RUN}`);
ok(Boolean(created), "product exists on the server");

if (created) {
  const detail = await fetch(`${API}/admin/products/${created.id}`, { headers: auth })
    .then((r) => r.json()).then((j) => j.data);
  const skus = detail.variants.map((v) => v.sku).sort();
  ok(skus.join(",") === `FT${RUN}-L,FT${RUN}-M`,
     `typed SKUs persisted (${skus.join(", ")})`);
  ok(detail.images.length === 2, `both images attached at create (${detail.images.length})`);
  ok(Boolean(detail.brandId), "new brand tagged on the product");
  ok(detail.variants.every((v) => v.price === 150000 || v.price === 160000),
     "prices stored in paisa");

  await fetch(`${API}/admin/products/${created.id}`, { method: "DELETE", headers: auth });
}

// remove the e2e brand
const brands = await fetch(`${API}/admin/brands?limit=100`, { headers: auth })
  .then((r) => r.json());
const testBrand = brands.data.items.find((b) => b.name === `E2E Brand ${RUN}`);
if (testBrand) {
  await fetch(`${API}/admin/brands/${testBrand.id}`, { method: "DELETE", headers: auth });
  console.log("  (cleaned up test brand)");
}

files.forEach((f) => unlinkSync(f));
await browser.close();
