import { chromium } from "playwright";
import { execSync } from "node:child_process";

const B = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const PNG = "/tmp/urc-e2e-brand.png";
execSync(`python3 -c "
import struct,zlib
def chunk(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c))
png=b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',2,2,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\\x00\\xff\\x00\\x00\\x00\\xff\\x00\\x00\\xff\\x00\\x00\\xff'))+chunk(b'IEND',b'')
open('${PNG}','wb').write(png)
"`);

const publicStore = () =>
  fetch(`${API}/store`, { headers: H }).then((r) => r.json()).then((j) => j.data);
const before = await publicStore();

const browser = await chromium.launch();
const page = await browser.newPage();
const tickets = [];
page.on("request", (r) => {
  if (r.url().includes("/admin/uploads/images") && r.method() === "POST") {
    tickets.push(JSON.parse(r.postData() ?? "{}").scope);
  }
});

await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.fill("#email", "admin@demo.local");
await page.fill("#password", "password123");
await page.click("button[type=submit]");
await page.waitForTimeout(3000);

await page.goto(B + "/branding", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

const fileInputs = page.locator('input[type="file"]');
ok((await fileInputs.count()) === 2, "two upload inputs (logo, favicon)");

await fileInputs.nth(0).setInputFiles(PNG);
await page.waitForFunction(() => !document.body.innerText.includes("Uploading…"), undefined, { timeout: 15000 });
await fileInputs.nth(1).setInputFiles(PNG);
await page.waitForFunction(() => !document.body.innerText.includes("Uploading…"), undefined, { timeout: 15000 });

ok(tickets.length === 2 && tickets.every((s) => s === "store"), `tickets minted under store scope (${tickets.join(",")})`);
ok(
  (await page.locator('header img, [class*="border-b"] img').count()) >= 1 ||
    (await page.locator("img[src^='blob:']").count()) >= 2,
  "uploaded images preview before save",
);

await page.click('button:has-text("Save branding")');
await page
  .waitForFunction(() => document.body.innerText.includes("Branding saved"), undefined, { timeout: 15000 })
  .catch(() => {});
ok((await page.innerText("body")).includes("Branding saved"), "save confirms with a toast");

const saved = await publicStore();
ok(typeof saved.logoUrl === "string" && saved.logoUrl.includes("/store/"), `public logoUrl set (${saved.logoUrl})`);
ok(typeof saved.faviconUrl === "string" && saved.faviconUrl.length > 0, "public faviconUrl set");
const served = saved.logoUrl ? (await fetch(saved.logoUrl)).status : 0;
ok(served === 200, `logo is served from storage (${served})`);

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
ok(
  (await page.getByRole("button", { name: /Replace logo/i }).count()) === 1,
  "after reload the logo tile shows Replace",
);

await page.getByRole("button", { name: /Remove logo/i }).click();
await page.getByRole("button", { name: /Remove favicon/i }).click();
await page.click('button:has-text("Save branding")');
await page.waitForTimeout(2500);
const cleared = await publicStore();
ok(cleared.logoUrl === before.logoUrl && cleared.faviconUrl === before.faviconUrl, "removing both restores the original state");

await browser.close();
