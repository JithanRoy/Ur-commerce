import { chromium } from "playwright";

const B = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const CID = "c39cfc0c-b1cf-4207-97c3-496382c8c341";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const token = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" },
  body: JSON.stringify({ email: "admin@demo.local", password: "password123" }),
}).then((r) => r.json()).then((j) => j.data.accessToken);
const auth = { Authorization: `Bearer ${token}`, "X-Tenant-Host": "demo.localhost" };

const serverProducts = async () =>
  fetch(`${API}/admin/collections/${CID}`, { headers: auth })
    .then((r) => r.json())
    .then((j) =>
      [...j.data.products]
        .sort((a, b) => a.position - b.position)
        .map((e) => e.product.name),
    );

const page = await browser.newPage();
await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.fill("#email", "admin@demo.local");
await page.fill("#password", "password123");
await page.click('button[type=submit]');
await page.waitForTimeout(3500);

await page.goto(B + "/collections", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
const manage = page.getByRole("link", { name: "Manage products" }).first();
ok((await manage.count()) === 1, "collections list offers Manage products");
await manage.click();
await page.waitForTimeout(2500);

ok(page.url().includes(`/collections/${CID}`), "manage screen opens");
const body = await page.textContent("body");
ok(body.includes("Eid Edit"), "shows the collection name");
ok(body.includes("Catalogue"), "shows the catalogue picker");

// add three specific products via search
for (const name of ["Jamdani Saree — Handwoven", "Printed Short Panjabi", "Embroidered Cotton Kurti"]) {
  await page.getByLabel("Search catalogue").fill(name.slice(0, 12));
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: `Add ${name} to collection` }).click();
  await page.waitForTimeout(300);
}
await page.getByLabel("Search catalogue").fill("");

const chosen = await page.locator("ol li").count();
ok(chosen === 3, `three products chosen (${chosen})`);

// reorder: move the third one up once
await page.getByRole("button", { name: "Move Embroidered Cotton Kurti up" }).click();
await page.waitForTimeout(300);

// save
const saveBtn = page.getByRole("button", { name: "Save collection" });
ok(await saveBtn.isEnabled(), "save enables when dirty");
await saveBtn.click();
await page.waitForFunction(
  () => [...document.querySelectorAll("[data-sonner-toast]")]
    .some((el) => el.textContent?.includes("Collection saved")),
  undefined, { timeout: 10000 },
).then(() => true).catch(() => false);

const toasts = await page.locator("[data-sonner-toast]").allTextContents();
ok(toasts.some((t) => t.includes("Collection saved with 3 products")),
   `save confirms with a toast (${JSON.stringify(toasts).slice(0, 70)})`);

const onServer = await serverProducts();
ok(onServer.length === 3, `server holds 3 products (${onServer.length})`);
ok(onServer[1] === "Embroidered Cotton Kurti",
   `reorder persisted (${onServer.join(" | ")})`);

// public collections reflect the count
const pub = await fetch(`${API}/collections`, {
  headers: { "X-Tenant-Host": "demo.localhost" },
}).then((r) => r.json()).then((j) => j.data[0]);
ok(pub.productCount === 3, `public productCount is 3 (${pub.productCount})`);

// survives a reload with state intact
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
ok((await page.locator("ol li").count()) === 3, "reload shows the saved 3");
ok(await page.getByRole("button", { name: "Save collection" }).isDisabled(),
   "save disabled when clean");

// remove one and save again
await page.getByRole("button", { name: /Remove .* from collection/ }).first().click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Save collection" }).click();
await page.waitForTimeout(2500);
ok((await serverProducts()).length === 2, "removal persists (3 → 2)");

await browser.close();
