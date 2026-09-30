import { chromium } from "playwright";

const B = "http://localhost:3100";
const H = { "X-Tenant-Host": "demo.localhost" };
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const hero = await fetch("http://localhost:3002/api/v1/hero", { headers: H })
  .then((r) => r.json())
  .then((j) => j.data);
ok(Array.isArray(hero.slides), `GET /hero returns a slides array (${hero.slides.length})`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(B + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const carousel = page.locator('[aria-roledescription="carousel"]');
if (hero.slides.length === 0) {
  ok((await carousel.count()) === 0, "no slides → no carousel");
  ok((await page.innerText("body")).includes("Shop the collection"), "no slides → static hero with its buttons");
} else {
  ok((await carousel.count()) === 1, "slides → carousel renders");
  const rendered = await page.locator('[aria-roledescription="slide"]').count();
  ok(rendered >= 1 && rendered <= hero.slides.length, `renders up to ${hero.slides.length} slides (${rendered})`);
  const first = page.locator('[aria-roledescription="slide"] img').first();
  ok((await first.getAttribute("loading")) === "eager", "first slide is not lazy");
  ok(
    (await page.locator('[aria-label^="Go to slide"]').count()) === (rendered > 1 ? rendered : 0),
    "dots only when more than one slide",
  );
  const box = await page.locator('[aria-roledescription="slide"]').first().boundingBox();
  ok(Math.abs(box.width / box.height - 2.4) < 0.05, "slide height reserved (12/5)");
}
ok(errors.length === 0, `no page errors ${errors.join(" | ")}`);
await browser.close();
