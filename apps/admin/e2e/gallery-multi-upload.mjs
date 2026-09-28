import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { unlinkSync } from "node:fs";

const B = "http://localhost:5273";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const files = ["/tmp/urc-m1.png", "/tmp/urc-m2.png", "/tmp/urc-m3.png"];
execSync(`python3 -c "
import struct,zlib
def chunk(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c))
for i,p in enumerate(['${files[0]}','${files[1]}','${files[2]}']):
    px=bytes([0,(i*90)%256,60,200])
    png=b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(px))+chunk(b'IEND',b'')
    open(p,'wb').write(png)
"`);

const page = await browser.newPage();
await page.route("**/urc-media/**", async (route) => {
  await new Promise((r) => setTimeout(r, 900));
  await route.continue();
});
const attaches = [];
page.on("response", (r) => {
  if (/\/admin\/products\/[^/]+\/images$/.test(r.url()) && r.request().method() === "POST")
    attaches.push(r.status());
});

await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.fill("#email", "admin@demo.local");
await page.fill("#password", "password123");
await page.click('button[type=submit]');
await page.waitForTimeout(3500);

await page.goto(B + "/products/e5e7bffc-bb04-49f1-8a93-48212ed5b536", {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(3000);

ok((await page.getByText("Drag images here").count()) > 0, "shows a drop zone");
ok((await page.locator('input[type=file][multiple]').count()) > 0,
   "file input accepts MULTIPLE files");

const before = await page.locator("ul li img").count();

const chooser = page.waitForEvent("filechooser");
await page.getByRole("button", { name: "browse your files" }).click();
(await chooser).setFiles(files);

let sawProgress = false;
let sawPreview = false;
for (let i = 0; i < 25 && !sawProgress; i++) {
  await page.waitForTimeout(60);
  if ((await page.locator(".animate-spin").count()) > 0) sawProgress = true;
  if ((await page.locator('ul li img[src^="blob:"]').count()) > 0) sawPreview = true;
}
ok(sawProgress, "shows a spinner while uploading");
ok(sawPreview, "shows an instant local preview before the upload finishes");

await page.waitForTimeout(9000);
ok(attaches.length === 3 && attaches.every((s) => s === 201),
   `all 3 attached (${JSON.stringify(attaches)})`);

const after = await page.locator("ul li img").count();
ok(after === before + 3, `gallery grew by 3 (${before} → ${after})`);

ok((await page.getByText("Primary").count()) === 1, "exactly one Primary badge");

// clean up the three we added
for (let i = 0; i < 3; i++) {
  const btn = page.getByLabel("Remove image").last();
  await btn.click({ force: true });
  await page.waitForTimeout(1800);
}
const final = await page.locator("ul li img").count();
ok(final === before, `cleaned up (back to ${final})`);

files.forEach((f) => unlinkSync(f));
await browser.close();
