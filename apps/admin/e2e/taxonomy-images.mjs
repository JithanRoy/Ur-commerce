import { chromium } from "playwright";
import { writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";

const B = "http://localhost:5273";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const PNG = "/tmp/urc-e2e-logo.png";
execSync(`python3 -c "
import struct,zlib
def chunk(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c))
png=b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',2,2,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\\x00\\xff\\x00\\x00\\x00\\xff\\x00\\x00\\xff\\x00\\x00\\xff'))+chunk(b'IEND',b'')
open('${PNG}','wb').write(png)
"`);

const page = await browser.newPage();
const uploads = [];
page.on("response", (r) => {
  if (r.url().includes("/uploads/images")) uploads.push(r.status());
});

await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.fill("#email", "admin@demo.local");
await page.fill("#password", "password123");
await page.click('button[type=submit]');
await page.waitForTimeout(3500);

for (const [route, label] of [["/brands", "logo"], ["/categories", "banner"], ["/collections", "banner"]]) {
  await page.goto(B + route, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const firstRow = page.locator("tbody tr").first();
  const uploadBtn = firstRow.getByRole("button", {
    name: new RegExp(`(Upload|Replace) ${label}`, "i"),
  });
  const present = (await uploadBtn.count()) > 0;
  ok(present, `${route}: offers an upload control`);
  if (!present) continue;

  const before = uploads.length;
  const chooser = page.waitForEvent("filechooser");
  await uploadBtn.click();
  (await chooser).setFiles(PNG);
  await page.waitForTimeout(4000);

  ok(uploads.length > before && uploads.at(-1) === 201,
     `${route}: ticket minted (${uploads.at(-1)})`);

  const img = firstRow.locator("img");
  ok((await img.count()) > 0 && (await img.isVisible()),
     `${route}: image renders in that row after upload`);

  const removeBtn = firstRow.getByRole("button", {
    name: new RegExp(`Remove ${label}`, "i"),
  });
  ok((await removeBtn.count()) > 0, `${route}: offers Remove once set`);
  await removeBtn.click();
  await page.waitForTimeout(2500);
  ok((await firstRow.locator("img").count()) === 0,
     `${route}: remove clears that row`);
}

unlinkSync(PNG);
await browser.close();
