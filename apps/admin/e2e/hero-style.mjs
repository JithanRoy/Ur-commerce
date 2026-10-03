import { chromium } from "playwright";
import { execSync } from "node:child_process";

const B = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@demo.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "password123";
const SHOT = process.env.HERO_SHOT;
const RUN = Date.now().toString(36);
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};

function writePng(path, [r, g, b], width, height) {
  execSync(`python3 -c "
import struct,zlib
def chunk(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c))
row=b'\\x00'+bytes([${r},${g},${b}])*${width}
png=b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',${width},${height},8,2,0,0,0))+chunk(b'IDAT',zlib.compress(row*${height}))+chunk(b'IEND',b'')
open('${path}','wb').write(png)
"`);
  return path;
}

const PHONE_PNG = writePng("/tmp/urc-e2e-hero-phone.png", [30, 160, 90], 8, 10);
const ART_PNG = writePng("/tmp/urc-e2e-hero-art.png", [200, 120, 30], 10, 10);

const login = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then((r) => r.json());
if (!login.success) {
  console.log(`✗ owner login failed for ${EMAIL}: ${login.message}`);
  process.exit(1);
}
const AUTH = { ...H, Authorization: `Bearer ${login.data.accessToken}` };

const publicHero = () =>
  fetch(`${API}/hero`, { headers: H }).then((r) => r.json()).then((j) => j.data);
const adminHero = () =>
  fetch(`${API}/admin/hero`, { headers: AUTH }).then((r) => r.json()).then((j) => j.data);

const initial = await adminHero();
const original = {
  heroStyle: initial.style,
  heroAutoplay: initial.autoplay,
  heroIntervalMs: initial.intervalMs,
  heroHeadline: initial.static.headline,
  heroPrimaryLabel: initial.static.primaryLabel,
  heroPrimaryUrl: initial.static.primaryUrl,
  heroSecondaryLabel: initial.static.secondaryLabel,
  heroSecondaryUrl: initial.static.secondaryUrl,
  heroBadges: initial.static.badges,
};
const originalSlideIds = initial.slides.map((s) => s.id);
const firstSlide = initial.slides[0];
const canTryPhoneImage = Boolean(firstSlide) && firstSlide.mobileImageUrl === null;
const canTryArtwork = initial.static.imageUrl === null;
console.log(
  `recorded: style ${original.heroStyle}, autoplay ${original.heroAutoplay}, ${original.heroIntervalMs}ms, ${originalSlideIds.length} slides, ${original.heroBadges.length} badges`,
);

const restore = async () => {
  const body = { ...original, ...(canTryArtwork ? { heroImageUrl: null } : {}) };
  const settings = await fetch(`${API}/admin/hero/settings`, {
    method: "PATCH",
    headers: AUTH,
    body: JSON.stringify(body),
  }).then((r) => r.json());
  if (canTryPhoneImage) {
    await fetch(`${API}/admin/hero/slides/${firstSlide.id}`, {
      method: "PATCH",
      headers: AUTH,
      body: JSON.stringify({ mobileImageUrl: null }),
    });
  }
  return settings.success;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
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
const waitForPublic = async (predicate, timeout = 8000) => {
  const until = Date.now() + timeout;
  let hero = await publicHero();
  while (!predicate(hero) && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 300));
    hero = await publicHero();
  }
  return hero;
};
const styleRadio = (name) => page.getByRole("radio", { name });
const saveHeadline = page.getByRole("button", { name: "Save headline hero" });
const liveLine = () => page.locator("text=Live on your storefront").innerText();

try {
  await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/products/, { timeout: 15000 }).catch(() => {});
  await page.goto(B + "/hero", { waitUntil: "domcontentloaded" });
  ok(await waitForText("What the top of your homepage shows"), "style picker renders at the top");

  ok((await page.getByRole("radio").count()) === 3, "three hero style choices");
  ok(await styleRadio(/Image slideshow/).isChecked(), "Image slideshow is selected for a CAROUSEL store");
  ok((await liveLine()).includes("Image slideshow"), "live style reads Image slideshow");
  ok(!(await page.locator("#heroAutoplay").isDisabled()), "rotation controls are enabled for the slideshow");
  ok((await bodyText()).includes(`${originalSlideIds.length} of 10`), "merchant slides are listed");
  ok((await page.locator('input[type="url"]').count()) === 0, "no URL inputs on the screen");
  ok(await saveHeadline.isDisabled(), "Save headline hero is disabled with no changes");
  ok((await page.locator('a[href="/branding"]', { hasText: "Edit in Branding" }).count()) === 1, "eyebrow and tagline link to Branding");
  ok((await bodyText()).includes(initial.static.eyebrow ?? "Not set"), "eyebrow shown read-only");

  if (SHOT) await page.screenshot({ path: `${SHOT}/hero-carousel-1280.png`, fullPage: true });

  if (canTryPhoneImage) {
    const phoneInput = page.locator('ol[aria-label="Hero slides in display order"] > li').first().locator('input[type="file"]');
    await phoneInput.setInputFiles(PHONE_PNG);
    ok(await waitForText("Phone image saved."), "phone image upload confirms with a toast");
    const withPhone = await waitForPublic((h) => h.slides[0]?.mobileImageUrl);
    ok(Boolean(withPhone.slides[0]?.mobileImageUrl), "public slide 1 carries a mobileImageUrl");
    await page.getByRole("button", { name: "Remove phone image" }).first().click();
    ok(await waitForText("Phone image removed."), "removing the phone image confirms with a toast");
    const withoutPhone = await waitForPublic((h) => h.slides[0]?.mobileImageUrl === null);
    ok(withoutPhone.slides[0]?.mobileImageUrl === null, "public slide 1 mobileImageUrl back to null");
  } else {
    console.log("- skipped phone image round trip: slide 1 already has a phone image");
  }

  await styleRadio(/Headline & buttons/).check();
  ok(await waitForText("Your homepage now shows the headline hero."), "switching to STATIC confirms with a toast");
  let pub = await waitForPublic((h) => h.style === "STATIC");
  ok(pub.style === "STATIC" && pub.static !== null, "public /hero style STATIC with static content");
  ok(await page.locator("#heroAutoplay").isDisabled(), "rotation controls are disabled outside the slideshow");
  ok((await bodyText()).includes("Only used by the image slideshow."), "rotation card explains why it is disabled");

  const headline = `E2E headline ${RUN}`;
  await page.fill("#hero-headline", headline);
  ok(await saveHeadline.isEnabled(), "editing enables Save headline hero");
  await saveHeadline.click();
  ok(await waitForText("Headline hero saved."), "saving the headline hero confirms with a toast");
  pub = await waitForPublic((h) => h.static?.headline === headline);
  ok(pub.static?.headline === headline, "public static.headline reflects the edit");
  ok(await saveHeadline.isDisabled(), "form is clean again after saving");

  await page.fill("#hero-primaryUrl", "shop");
  await saveHeadline.click();
  ok(await waitForText("Start with / for a page in your shop"), "a link without / or https:// is rejected inline");
  await page.fill("#hero-primaryUrl", "javascript:alert(1)");
  await saveHeadline.click();
  await page.waitForTimeout(400);
  pub = await publicHero();
  ok(pub.static?.primaryUrl === original.heroPrimaryUrl, "an unsafe link never reaches the server");
  await page.fill("#hero-primaryLabel", "");
  await page.fill("#hero-primaryUrl", "/shop");
  await saveHeadline.click();
  ok(await waitForText("Add the text shown on this button."), "a link without button text is rejected inline");
  await page.getByRole("button", { name: "Discard changes" }).click();
  ok((await page.inputValue("#hero-primaryLabel")) === (original.heroPrimaryLabel ?? ""), "Discard changes restores the saved values");

  const badgeCount = original.heroBadges.length;
  if (badgeCount < 4) {
    await page.getByRole("button", { name: "Add badge" }).click();
    await page.getByRole("textbox", { name: `Badge ${badgeCount + 1}`, exact: true }).fill(`E2E ${RUN}`);
    await page.getByRole("button", { name: `Move badge ${badgeCount + 1} up` }).click();
    await saveHeadline.click();
    ok(await waitForText("Headline hero saved."), "badge change saves with a toast");
    pub = await waitForPublic((h) => h.static?.badges.includes(`E2E ${RUN}`));
    ok(pub.static?.badges[badgeCount - 1] === `E2E ${RUN}`, "public badges keep the reordered position");
    if (badgeCount + 1 === 4) {
      ok(await page.getByRole("button", { name: "Maximum of 4 badges" }).isDisabled(), "badge add disables at 4");
    }
    await page.getByRole("button", { name: `Remove badge ${badgeCount}` }).click();
    await saveHeadline.click();
    await waitForText("Headline hero saved.");
    pub = await waitForPublic((h) => !h.static?.badges.includes(`E2E ${RUN}`));
    ok(JSON.stringify(pub.static?.badges) === JSON.stringify(original.heroBadges), "badge removal restores the original list");
  }

  if (canTryArtwork) {
    const artInput = page.locator('section[aria-labelledby="hero-static-heading"] input[type="file"]');
    await artInput.setInputFiles(ART_PNG);
    await page.waitForFunction(() => document.body.innerText.includes("Remove artwork"), undefined, { timeout: 15000 }).catch(() => {});
    await saveHeadline.click();
    await waitForText("Headline hero saved.");
    pub = await waitForPublic((h) => h.static?.imageUrl);
    ok(Boolean(pub.static?.imageUrl), "uploaded artwork appears on the public static hero");
    await page.getByRole("button", { name: "Remove artwork" }).click();
    await saveHeadline.click();
    await waitForText("Headline hero saved.");
    pub = await waitForPublic((h) => h.static?.imageUrl === null);
    ok(pub.static?.imageUrl === null, "removing artwork clears it publicly");
  }

  if (SHOT) await page.screenshot({ path: `${SHOT}/hero-static-1280.png`, fullPage: true });

  await styleRadio(/No hero/).check();
  ok(await waitForText("The homepage hero is turned off."), "switching to OFF confirms with a toast");
  pub = await waitForPublic((h) => h.style === "OFF");
  ok(pub.style === "OFF", "public /hero style OFF");
  ok((await bodyText()).includes("Your homepage has no hero right now."), "OFF explains that content is kept");

  await styleRadio(/Image slideshow/).check();
  ok(await waitForText("Your homepage now shows the image slideshow."), "switching back to CAROUSEL confirms with a toast");
  pub = await waitForPublic((h) => h.style === "CAROUSEL");
  ok(pub.style === "CAROUSEL", "public /hero style CAROUSEL");
  ok(
    JSON.stringify(pub.slides.map((s) => s.id)) === JSON.stringify(originalSlideIds),
    `public /hero shows the ${originalSlideIds.length} merchant slides in their original order`,
  );
  ok(!(await page.locator("#heroAutoplay").isDisabled()), "rotation controls re-enable for the slideshow");

  ok(consoleErrors.length === 0, `no console errors${consoleErrors.length ? `: ${consoleErrors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ unexpected error: ${error.message}`);
} finally {
  await browser.close();
  ok(await restore(), "restore PATCH succeeded");
  const after = await adminHero();
  ok(after.style === original.heroStyle, `style restored to ${original.heroStyle}`);
  ok(after.autoplay === original.heroAutoplay && after.intervalMs === original.heroIntervalMs, "rotation restored");
  ok(
    after.static.headline === original.heroHeadline &&
      after.static.primaryLabel === original.heroPrimaryLabel &&
      after.static.primaryUrl === original.heroPrimaryUrl &&
      after.static.secondaryLabel === original.heroSecondaryLabel &&
      after.static.secondaryUrl === original.heroSecondaryUrl &&
      JSON.stringify(after.static.badges) === JSON.stringify(original.heroBadges),
    "static headline, buttons and badges restored",
  );
  ok(JSON.stringify(after.slides.map((s) => s.id)) === JSON.stringify(originalSlideIds), "slides untouched");
}

console.log(failures === 0 ? "\nall hero style checks passed" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
