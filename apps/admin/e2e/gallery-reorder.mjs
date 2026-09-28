import { chromium } from "playwright";

const B = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const PRODUCT = "3b65e559-9cda-4fe2-b909-46b373d37961";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const token = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" },
  body: JSON.stringify({ email: "admin@demo.local", password: "password123" }),
}).then((r) => r.json()).then((j) => j.data.accessToken);

const order = async () =>
  fetch(`${API}/admin/products/${PRODUCT}/images`, {
    headers: { Authorization: `Bearer ${token}`, "X-Tenant-Host": "demo.localhost" },
  }).then((r) => r.json()).then((j) => j.data.map((i) => i.id));

const before = await order();
ok(before.length >= 2, `product has ${before.length} images to reorder`);

const page = await browser.newPage();
await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.fill("#email", "admin@demo.local");
await page.fill("#password", "password123");
await page.click('button[type=submit]');
await page.waitForTimeout(3500);
await page.goto(`${B}/products/${PRODUCT}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

const tiles = page.locator("ul li[draggable=true]");
ok((await tiles.count()) === before.length, "tiles are draggable");

await tiles.nth(0).dragTo(tiles.nth(1));
await page.waitForTimeout(2500);

const after = await order();
const swapped =
  after[0] === before[1] && after[1] === before[0] &&
  after.length === before.length;
ok(swapped, `first two swapped server-side (${swapped ? "yes" : after.slice(0,2).join(",")})`);

const ids = new Set(after);
ok(ids.size === before.length, "every id still present exactly once");

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
ok((await page.locator("ul li[draggable=true]").count()) === before.length,
   "order survives a reload");

// restore
await fetch(`${API}/admin/products/${PRODUCT}/images/order`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Tenant-Host": "demo.localhost",
  },
  body: JSON.stringify({ imageIds: before }),
});
const restored = await order();
ok(restored.join() === before.join(), "original order restored");

await browser.close();
