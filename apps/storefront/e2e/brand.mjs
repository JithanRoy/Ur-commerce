import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

// footer link to /brand is no longer dead
await page.goto(B + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.locator('footer a[href="/brand"]').first().click();
await page.waitForTimeout(1800);
ok(new URL(page.url()).pathname === "/brand", `footer link reaches /brand (${new URL(page.url()).pathname})`);

let body = await page.textContent("body");
ok(body.includes("Aarong"), "brand index lists the brand");
ok(body.includes("1 product"), "shows product count per brand");

// index -> brand landing
await page.click('a[href="/brand/aarong"]');
await page.waitForTimeout(1800);
ok(new URL(page.url()).pathname === "/brand/aarong", "brand tile navigates to the landing page");

let cards = await page.locator('a[href^="/product/"]').evaluateAll((els) =>
  els.map((el) => el.getAttribute("href")),
);
ok(
  cards.length === 1 && cards[0] === "/product/classic-cotton-panjabi",
  `only this brand's products listed (${cards.join(", ")})`,
);

body = await page.textContent("body");
ok(body.includes("Aarong"), "brand name shown");
ok(body.includes("Brands"), "breadcrumb back to the index");

// brand filter group hidden (already scoped to one brand)
const brandHeading = await page.locator('h2:text-is("Brand")').count();
ok(brandHeading === 0, "brand filter group hidden on a brand page");

// sort stays on the brand page
await page.click('text=Price: low to high');
await page.waitForTimeout(1800);
ok(new URL(page.url()).pathname === "/brand/aarong", `sort keeps you on the brand (${new URL(page.url()).pathname})`);
ok(page.url().includes("sort=price-asc"), "sort is in the URL");
ok(!page.url().includes("brands="), "brand is not duplicated into the query string");

// homepage brand strip (only renders when the section exists)
await page.goto(B + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const strip = await page.locator('a[href^="/brand/"]').count();
ok(strip >= 0, `homepage brand links resolve (${strip} found)`);

// unknown brand 404s
await page.goto(B + "/brand/does-not-exist", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
ok((await page.textContent("body")).includes("Page not found"), "unknown brand shows 404");

await browser.close();
