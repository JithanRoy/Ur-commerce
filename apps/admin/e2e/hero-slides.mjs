import { chromium } from "playwright";
import { execSync } from "node:child_process";

const B = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@demo.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "password123";
const STAFF_EMAIL = process.env.STAFF_EMAIL ?? "staff@demo.local";
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? "password123";
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};

function writePng(path, [r, g, b]) {
  execSync(`python3 -c "
import struct,zlib
def chunk(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c))
row=b'\\x00'+bytes([${r},${g},${b}])*12
png=b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',12,5,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(row*5))+chunk(b'IEND',b'')
open('${path}','wb').write(png)
"`);
  return path;
}

const PNG_A = writePng("/tmp/urc-e2e-hero-a.png", [200, 30, 30]);
const PNG_B = writePng("/tmp/urc-e2e-hero-b.png", [30, 30, 200]);

const login = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then((r) => r.json());
if (!login.success) {
  console.log(`✗ owner login failed for ${EMAIL}: ${login.message} (set ADMIN_EMAIL / ADMIN_PASSWORD)`);
  process.exit(1);
}
const AUTH = { ...H, Authorization: `Bearer ${login.data.accessToken}` };

const publicHero = () =>
  fetch(`${API}/hero`, { headers: H }).then((r) => r.json()).then((j) => j.data);
const adminHero = () =>
  fetch(`${API}/admin/hero`, { headers: AUTH }).then((r) => r.json()).then((j) => j.data);
const removeAllSlides = async () => {
  for (const slide of (await adminHero()).slides) {
    await fetch(`${API}/admin/hero/slides/${slide.id}`, { method: "DELETE", headers: AUTH });
  }
};
const restoreSettings = () =>
  fetch(`${API}/admin/hero/settings`, {
    method: "PATCH",
    headers: AUTH,
    body: JSON.stringify({ heroAutoplay: true, heroIntervalMs: 5000 }),
  });

const initial = await adminHero();
if (initial.slides.length > 0) {
  console.log(`✗ demo store already has ${initial.slides.length} hero slide(s); clear them before running this script`);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(e.message));

const bodyText = () => page.innerText("body");
const waitForText = (text, timeout = 15000) =>
  page
    .waitForFunction((t) => document.body.innerText.includes(t), text, { timeout })
    .then(() => true)
    .catch(() => false);
const cards = page.locator('ol[aria-label="Hero slides in display order"] > li');

try {
  await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/products/, { timeout: 15000 }).catch(() => {});

  const navLink = page.locator('aside a[href="/hero"]');
  ok((await navLink.count()) === 1, "owner sees the Homepage hero nav item");
  await navLink.click();
  await page.waitForURL(/\/hero$/, { timeout: 10000 }).catch(() => {});
  ok(await waitForText("No slides yet"), "empty state explains the default hero");
  ok((await bodyText()).includes("0 of 10"), "count reads 0 of 10");
  ok((await bodyText()).includes("2400 × 1000"), "uploader recommends a banner size");
  ok((await page.locator('input[type="url"]').count()) === 0, "no URL inputs on the screen");

  await page.locator('input[type="file"]').setInputFiles([PNG_A, PNG_B]);
  ok(await waitForText("2 slides added."), "multi-file upload confirms with one toast");
  await page.waitForFunction(
    () => document.querySelectorAll('ol[aria-label="Hero slides in display order"] > li').length === 2,
    undefined,
    { timeout: 10000 },
  ).catch(() => {});
  ok((await cards.count()) === 2, "both slides appear as cards");
  ok((await bodyText()).includes("2 of 10"), "count reads 2 of 10");

  const added = await adminHero();
  const [firstId, secondId] = added.slides.map((s) => s.id);
  let pub = await publicHero();
  ok(
    pub.slides.length === 2 && pub.slides[0].id === firstId && pub.slides[1].id === secondId,
    "public /hero shows both slides in upload order",
  );
  const served = await fetch(pub.slides[0].imageUrl).then((r) => r.status).catch(() => 0);
  ok(served === 200, `slide image is served from storage (${served})`);

  await page.getByRole("button", { name: "Move slide 2 up" }).click();
  ok(await waitForText("Slide order saved."), "keyboard reorder confirms with a toast");
  await page.waitForTimeout(500);
  pub = await publicHero();
  ok(pub.slides[0].id === secondId && pub.slides[1].id === firstId, "public order flips after move up");

  const handle = (index) => cards.nth(index).locator("[draggable=true]");
  await handle(1).dragTo(cards.nth(0));
  await waitForText("Slide order saved.");
  await page.waitForTimeout(1200);
  pub = await publicHero();
  ok(pub.slides[0].id === firstId && pub.slides[1].id === secondId, "drag-and-drop restores the original order");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const firstAlt = page.locator(`#hero-alt-${firstId}`);
  ok((await firstAlt.count()) === 1 && (await cards.count()) === 2, "order survives a reload");

  await firstAlt.fill("E2E red banner");
  await firstAlt.press("Enter");
  ok(await waitForText("Alt text saved."), "alt text saves on Enter with a toast");
  await page.waitForTimeout(500);
  pub = await publicHero();
  ok(pub.slides[0].alt === "E2E red banner", "public slide carries the new alt text");

  await firstAlt.fill("");
  await firstAlt.blur();
  ok(await waitForText("Slide marked as decorative."), "clearing alt on blur marks it decorative");
  await page.waitForTimeout(500);
  ok((await publicHero()).slides[0].alt === null, "empty alt round-trips as null");

  await page.selectOption("#heroIntervalMs", "8000");
  ok(await waitForText("Each slide now shows for 8 seconds."), "interval saves on change with a toast");
  await page.locator("#heroAutoplay").uncheck();
  ok(await waitForText("Autoplay turned off."), "autoplay toggle saves with a toast");
  ok(await page.locator("#heroIntervalMs").isDisabled(), "interval is disabled while autoplay is off");
  pub = await publicHero();
  ok(pub.autoplay === false && pub.intervalMs === 8000, `public settings round-trip (${pub.autoplay}, ${pub.intervalMs})`);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  ok(
    !(await page.locator("#heroAutoplay").isChecked()) &&
      (await page.inputValue("#heroIntervalMs")) === "8000",
    "settings persist across a reload",
  );

  for (const position of [1, 1]) {
    await page.getByRole("button", { name: `Remove slide ${position}` }).click();
    await page.getByRole("button", { name: "Remove slide", exact: true }).click();
    await waitForText("Slide removed from your homepage.");
    await page.waitForTimeout(800);
  }
  ok((await cards.count()) === 0 && (await waitForText("No slides yet")), "deleting both returns to the empty state");
  ok((await publicHero()).slides.length === 0, "public slides are empty after deleting both");

  const eleven = Array.from({ length: 11 }, (_, i) => writePng(`/tmp/urc-e2e-hero-cap-${i}.png`, [i * 20, 120, 80]));
  await page.locator('input[type="file"]').setInputFiles(eleven);
  ok(await waitForText("1 file was skipped"), "an 11-file drop explains how many were skipped");
  ok(await waitForText("10 slides added.", 30000), "adds up to the cap");
  ok(await waitForText("Your hero has the maximum of 10 slides"), "dropzone explains why it is disabled at 10");
  ok(await page.locator('input[type="file"]').isDisabled(), "file input is disabled at 10");
  ok((await bodyText()).includes("10 of 10"), "count reads 10 of 10");

  const staffLogin = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email: STAFF_EMAIL, password: STAFF_PASSWORD }),
  }).then((r) => r.json());
  if (staffLogin.success) {
    const staffPage = await (await browser.newContext()).newPage();
    await staffPage.goto(B + "/login", { waitUntil: "domcontentloaded" });
    await staffPage.waitForTimeout(800);
    await staffPage.fill("#email", STAFF_EMAIL);
    await staffPage.fill("#password", STAFF_PASSWORD);
    await staffPage.click("button[type=submit]");
    await staffPage.waitForURL(/\/products/, { timeout: 15000 }).catch(() => {});
    ok((await staffPage.locator('a[href="/hero"]').count()) === 0, "staff does not see the Homepage hero nav item");
    const staffHeroRequests = [];
    staffPage.on("request", (r) => {
      if (r.url().includes("/admin/hero")) staffHeroRequests.push(r.url());
    });
    await staffPage.goto(B + "/hero", { waitUntil: "domcontentloaded" });
    await staffPage.waitForTimeout(2000);
    ok(
      (await staffPage.innerText("body")).includes("Only the store owner can manage the homepage hero"),
      "staff typing /hero sees the owner-only state",
    );
    ok(staffHeroRequests.length === 0, "staff never requests /admin/hero");
  } else {
    console.log(`- staff checks skipped (${STAFF_EMAIL}: ${staffLogin.message})`);
  }

  ok(consoleErrors.length === 0, `no console errors${consoleErrors.length ? `: ${consoleErrors.join(" | ")}` : ""}`);
} finally {
  await removeAllSlides();
  await restoreSettings();
  const restored = await publicHero();
  ok(
    restored.slides.length === 0 && restored.autoplay === true && restored.intervalMs === 5000,
    "restored: no slides, autoplay on, 5000 ms",
  );
  await browser.close();
}

process.exit(failures === 0 ? 0 : 1);
