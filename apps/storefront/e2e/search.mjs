import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

// the header field is real, not a link dressed as search
await page.goto(B + "/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
ok(
  (await page.locator('input[type="search"]').count()) > 0,
  "header has a real search input",
);
ok(
  (await page.locator('a[aria-label="Search"]').count()) === 0,
  "no fake search link remains",
);

// searching from the header lands on /shop with the term in the URL
await page.fill('input[type="search"]', "panjabi");
await page.press('input[type="search"]', "Enter");
await page.waitForURL(/\/shop\?search=/, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(2500);

ok(page.url().includes("search=panjabi"), "search term reaches the URL");

await page
  .locator('a[href^="/product/"]')
  .first()
  .waitFor({ timeout: 15000 })
  .catch(() => {});

let body = await page.innerText("body");
ok(body.includes("Results for"), "page states what was searched");
ok(body.includes("panjabi"), "the term is echoed back");

const hrefs = await page.locator('a[href^="/product/"]').evaluateAll((els) =>
  els.map((el) => el.getAttribute("href")),
);
ok(
  hrefs.some((h) => h.includes("classic-cotton-panjabi")),
  "matching product listed",
);
ok(
  !hrefs.some((h) => h.includes("slim-fit-denim-shirt")),
  "non-matching product excluded",
);
ok(hrefs.length === 1, `exactly one result rendered (${hrefs.length})`);

// the input keeps the active term after navigation
ok(
  (await page.inputValue('input[type="search"]')) === "panjabi",
  "input reflects the active search",
);

// a DIFFERENT term must return different results (revalidate must not cache across queries)
await page.goto(B + "/shop?search=denim", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const denimHrefs = await page
  .locator('a[href^="/product/"]')
  .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
ok(
  denimHrefs.some((h) => h.includes("slim-fit-denim-shirt")) &&
    !denimHrefs.some((h) => h.includes("classic-cotton-panjabi")),
  "a different term returns different results (not cached)",
);

// no match shows a useful empty state, not a blank grid
await page.goto(B + "/shop?search=zzzznothing", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
body = await page.innerText("body");
ok(body.includes("No products match"), "empty state shown for no matches");
ok(body.includes("zzzznothing"), "empty state repeats the term");
ok(
  (await page.locator('a[href^="/product/"]').count()) === 0,
  "no product links when nothing matches",
);

// clearing returns to the full catalogue
await page.click("text=Clear search");
await page.waitForTimeout(2500);
ok(!page.url().includes("search="), "clear removes the term from the URL");
const allHrefs = await page
  .locator('a[href^="/product/"]')
  .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
ok(
  allHrefs.some((h) => h.includes("classic-cotton-panjabi")) &&
    allHrefs.some((h) => h.includes("slim-fit-denim-shirt")),
  "clearing restores the full catalogue",
);

// search composes with sort rather than being dropped
await page.goto(B + "/shop?search=shirt", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
const sortLink = page.locator('a[href*="sort="]').first();
if ((await sortLink.count()) > 0) {
  await sortLink.click();
  await page.waitForTimeout(2500);
  ok(
    page.url().includes("search=shirt") && page.url().includes("sort="),
    "sorting keeps the search term",
  );
}

// mobile: the icon opens a real field
const m = await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage();
await m.goto(B + "/", { waitUntil: "domcontentloaded" });
await m.waitForTimeout(2000);
ok(
  (await m.locator('input[type="search"]:visible').count()) === 0,
  "mobile hides the field until asked",
);
await m.click('button[aria-label="Search"]');
await m.waitForTimeout(600);
ok(
  (await m.locator('input[type="search"]:visible').count()) > 0,
  "mobile search icon reveals the field",
);
await m.fill('input[type="search"]:visible', "denim");
await m.press('input[type="search"]:visible', "Enter");
await m.waitForTimeout(2500);
ok(m.url().includes("search=denim"), "mobile search navigates");

await browser.close();
