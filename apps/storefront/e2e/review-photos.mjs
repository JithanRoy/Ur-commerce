import { randomBytes } from "node:crypto";
import { deflateSync, crc32 } from "node:zlib";
import { chromium } from "playwright";

const B = "http://localhost:3100";
const ADMIN = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const SHOPPER = { email: "e2e-security@demo.local", password: "e2e-password-1" };
const OWNER = { email: process.env.ADMIN_EMAIL ?? "admin@demo.local", password: process.env.ADMIN_PASSWORD ?? "password123" };
const SHOT_DIR = process.env.REVIEW_SHOTS;
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};

function png(width, height, pixel) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(Buffer.from([0]), pixel(width, y));
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const solid = (r, g, b) => (width) => Buffer.alloc(width * 3).map((_, i) => [r, g, b][i % 3]);
const SMALL = { name: "fit.png", mimeType: "image/png", buffer: png(320, 320, solid(200, 120, 60)) };
const LARGE = { name: "fabric.png", mimeType: "image/png", buffer: png(1400, 1400, (width) => randomBytes(width * 3)) };
const DISGUISED = { name: "receipt.png", mimeType: "image/png", buffer: Buffer.from("%PDF-1.4\n% not an image\n".repeat(20)) };
const PDF = { name: "invoice.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n") };

async function api(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { ...H, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

async function deleteMyReviews(token) {
  const mine = await api("/reviews/mine?limit=100", { token });
  for (const review of mine.data?.items ?? []) {
    await api(`/reviews/${review.id}`, { method: "DELETE", token });
  }
}

const login = await api("/auth/login", { method: "POST", body: SHOPPER });
if (!login.success) {
  console.log("✗ test shopper missing — run e2e/reviews.mjs first");
  process.exit(1);
}
const token = login.data.accessToken;
await deleteMyReviews(token);
const product = (await api("/reviews/awaiting", { token })).data?.[0];
if (!product) {
  console.log("✗ test shopper has nothing to review — run e2e/reviews.mjs first");
  process.exit(1);
}
ok(LARGE.buffer.length > 5 * 1024 * 1024, `oversized source photo is ${(LARGE.buffer.length / 1048576).toFixed(1)} MB`);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name, target = page) => (SHOT_DIR ? target.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: true }) : null);

try {
  await page.goto(`${B}/login?returnTo=${encodeURIComponent("/account/reviews")}`, { waitUntil: "networkidle" });
  await page.fill("#email", SHOPPER.email);
  await page.fill("#password", SHOPPER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/account/reviews");

  const row = page.locator("li").filter({ hasText: product.name }).first();
  await row.getByRole("button", { name: "Rate it" }).click();
  await row.getByLabel(/^5 stars/).check({ force: true });
  const picker = row.getByLabel("Add photos");

  await picker.setInputFiles([PDF]);
  ok(await row.getByText("Use a JPEG, PNG, WebP or AVIF photo.").isVisible(), "a PDF is refused before upload");

  await picker.setInputFiles([SMALL, LARGE, DISGUISED]);
  await row.getByRole("img", { name: "Photo 3" }).waitFor();
  await page.waitForFunction(() => !document.querySelector('[role="status"][aria-label^="Uploading"], [role="status"] svg.animate-spin'), null, { timeout: 30000 }).catch(() => {});
  await row.getByRole("button", { name: "Post review" }).waitFor({ state: "visible" });
  await page.waitForTimeout(500);
  ok((await row.getByRole("img", { name: /^Photo \d/ }).count()) === 3 && (await row.getByRole("img", { name: /can.t be previewed/ }).count()) === 1, "three photos shown, the fake one as a placeholder");
  await shot("photos-picked");

  await row.getByRole("button", { name: "Post review" }).click();
  await row.getByText("That file is not the image it claims to be").first().waitFor();
  ok(true, "the server's “not the image it claims to be” message reaches the shopper");

  await row.getByRole("button", { name: "Remove photo 3" }).click();
  await row.getByRole("button", { name: "Post review" }).click();
  await page.getByRole("tab", { name: /Reviewed/, selected: true }).waitFor();
  ok(true, "review posts with the two good photos");

  const mine = (await api("/reviews/mine", { token })).data.items.find((r) => r.productId === product.id);
  ok(mine?.images.length === 2, `review has 2 photos (got ${mine?.images.length})`);
  ok(mine?.images[1]?.objectKey.endsWith(".jpg"), "oversized photo was shrunk to JPEG before upload");
  const sizes = await Promise.all((mine?.images ?? []).map((image) => fetch(image.url).then((r) => r.arrayBuffer()).then((b) => b.byteLength)));
  ok(sizes[1] > 0 && sizes[1] < 5 * 1024 * 1024, `uploaded photo is ${(sizes[1] / 1024).toFixed(0)} KB`);
  ok((await page.getByRole("button", { name: /View photo/ }).count()) === 2, "Reviewed tab shows the photos");

  await page.goto(`${B}/product/${product.slug}`, { waitUntil: "networkidle" });
  const article = page.locator("#reviews article").filter({ has: page.getByRole("button", { name: /View photo/ }) }).first();
  await article.waitFor();
  await shot("photos-product");
  await article.getByRole("button", { name: "View photo 1 of 2" }).click();
  const viewer = page.getByRole("dialog");
  await viewer.getByText("1 / 2").waitFor();
  await page.keyboard.press("ArrowRight");
  ok(await viewer.getByText("2 / 2").isVisible(), "viewer steps with the arrow keys");
  await shot("photos-viewer");
  await page.keyboard.press("Escape");
  ok(!(await viewer.isVisible().catch(() => false)), "Escape closes the viewer");

  const admin = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
  await admin.goto(`${ADMIN}/login`, { waitUntil: "domcontentloaded" });
  await admin.fill("#email", OWNER.email);
  await admin.fill("#password", OWNER.password);
  await admin.getByRole("button", { name: "Sign in", exact: true }).click();
  await admin.waitForURL((url) => !url.pathname.startsWith("/login"));
  await admin.goto(`${ADMIN}/reviews`, { waitUntil: "domcontentloaded" });
  const card = admin.locator("li").filter({ has: admin.getByRole("list", { name: "Customer photos" }) }).first();
  await card.waitFor();
  ok((await card.getByRole("img", { name: /Customer photo/ }).count()) === 2, "admin moderation shows the photos");
  await shot("photos-admin", admin);

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
  await shot("photos-crash");
} finally {
  await browser.close();
  await deleteMyReviews(token);
  const left = await api("/reviews/mine", { token });
  ok((left.data?.items ?? []).length === 0, "test reviews cleaned up");
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
