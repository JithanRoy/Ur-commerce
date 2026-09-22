import { chromium } from "playwright";
const B = "http://localhost:5273";
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const storagePuts = [];
page.on("response", (r) => {
  if (r.request().method() === "PUT" && r.url().includes("9100")) {
    storagePuts.push(r.status());
  }
});
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
await page.fill("#email", "admin@demo.local");
await page.fill("#password", "password123");
await page.click("button[type=submit]");
await page.waitForTimeout(3000);

await page.goto(B + "/products", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page
  .locator('a[href^="/products/"]')
  .filter({ hasNotText: "New product" })
  .first()
  .click();
await page.waitForTimeout(3000);
ok(
  /\/products\/[0-9a-f-]{36}/.test(page.url()),
  "opened an existing product, not the create form",
);

let body = await page.textContent("body");
ok(body.includes("Images"), "Images section renders on the product editor");
ok(
  body.includes("JPEG, PNG, WebP or AVIF"),
  "accepted formats stated up front",
);

const before = await page.locator("li:has(img)").count();

// a real 1x1 PNG, uploaded through the browser
const png = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0000003010100189dd5ca0000000049454e44ae426082",
  "hex",
);
await page.setInputFiles('input[type="file"]', {
  name: "e2e-upload.png",
  mimeType: "image/png",
  buffer: png,
});

await page
  .waitForFunction(
    (n) => document.querySelectorAll("li img").length > n,
    before,
    { timeout: 25000 },
  )
  .then(() => true)
  .catch(() => false);

const after = await page.locator("li:has(img)").count();
ok(after === before + 1, `image added to the gallery (${before} → ${after})`);
ok(storagePuts.includes(200), "browser PUT to storage returned 200");
ok(
  !consoleErrors.some((e) => /CORS|Access-Control/i.test(e)),
  "no CORS error on the storage PUT",
);

// the uploaded file actually renders
await page
  .waitForFunction(
    () =>
      [...document.querySelectorAll("li img")].some(
        (el) => el.complete && el.naturalWidth > 0,
      ),
    undefined,
    { timeout: 15000 },
  )
  .then(() => true)
  .catch(() => false);

const rendered = await page.evaluate(() => {
  const loaded = [...document.querySelectorAll("li img")].filter(
    (el) => el.complete && el.naturalWidth > 0,
  );
  const last = loaded[loaded.length - 1];
  return last ? { w: last.naturalWidth, src: last.src } : null;
});
ok(Boolean(rendered?.w), "uploaded image renders (naturalWidth > 0)");
ok(
  Boolean(rendered?.src?.includes("9100")),
  "image served from object storage",
);

// reorder: move the new image to the front
if (after > 1) {
  await page
    .locator("li:has(img)")
    .last()
    .getByLabel("Move earlier")
    .click();
  await page.waitForTimeout(2500);
  body = await page.textContent("body");
  ok(!body.includes("Could not reorder"), "reorder accepted by the server");
}

// pin to a variant
const selects = await page.locator("li:has(img) select").count();
if (selects > 0) {
  const options = await page
    .locator("li:has(img) select")
    .first()
    .locator("option")
    .count();
  ok(options > 1, "variant pinning offers the product's SKUs");
}

// remove exactly the image this run uploaded, leaving the store as we found it
const uploadedSrc = rendered?.src;
const uploadedCard = page
  .locator("li:has(img)")
  .filter({ has: page.locator(`img[src="${uploadedSrc}"]`) });
ok((await uploadedCard.count()) === 1, "can address the uploaded image by src");

await uploadedCard.getByLabel("Remove image").click();
await page
  .waitForFunction(
    (src) => !document.querySelector(`li img[src="${src}"]`),
    uploadedSrc,
    { timeout: 15000 },
  )
  .then(() => true)
  .catch(() => false);

ok(
  (await page.locator(`li img[src="${uploadedSrc}"]`).count()) === 0,
  "uploaded image removed",
);
ok(
  (await page.locator("li:has(img)").count()) === before,
  "gallery back to its original size",
);

await browser.close();
