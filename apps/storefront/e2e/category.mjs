import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

// homepage category tile is no longer dead
await page.goto(B + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
const tile = page.locator('a[href^="/category/"]').first();
ok(await tile.count() > 0, "homepage renders category tiles");
await tile.click();
await page.waitForTimeout(1800);
ok(page.url().includes("/category/"), `category tile navigates (${new URL(page.url()).pathname})`);

let body = await page.textContent("body");
ok(body.includes("Panjabi"), "category name shown");
ok(body.includes("1 product"), "product count shown");
ok(body.includes("Classic Cotton Panjabi"), "category product listed");
const cards = await page.locator('a[href^="/product/"]').evaluateAll((els) =>
  els.map((el) => el.getAttribute("href")),
);
ok(
  cards.length === 1 && cards[0] === "/product/classic-cotton-panjabi",
  `only the category's product is listed (${cards.join(", ")})`,
);

// sort stays on the category page
await page.click('text=Price: low to high');
await page.waitForTimeout(1800);
ok(page.url().includes("/category/panjabi"), `sort keeps you on the category (${new URL(page.url()).pathname})`);
ok(page.url().includes("sort=price-asc"), "sort is in the URL");

// category filter group hidden (we're already in one)
body = await page.textContent("body");
const sidebarHasCategory = /Category\s*\n?\s*Panjabi/.test(body);
ok(!sidebarHasCategory, "category filter group hidden on a category page");
ok(body.includes("Brand"), "brand filter still offered");

// brand facet stays on the category page
await page.click('a:has-text("Aarong")');
await page.waitForTimeout(1800);
ok(page.url().includes("/category/panjabi"), "brand filter keeps you on the category");
ok(page.url().includes("brands=aarong"), "brand filter in the URL");

// unknown category 404s
await page.goto(B + "/category/does-not-exist", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
ok((await page.textContent("body")).includes("Page not found"), "unknown category shows 404");

await browser.close();
