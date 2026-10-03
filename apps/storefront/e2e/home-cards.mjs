import { chromium } from "playwright";

const B = "http://localhost:3100";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const page = await (await browser.newContext({
  viewport: { width: 1400, height: 900 },
})).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));

await page.goto(B + "/", { waitUntil: "load" });
await page.waitForTimeout(3500);

const cards = await page.evaluate(() => {
  const sec = [...document.querySelectorAll("section")].find((s) =>
    s.textContent.includes("Hot Deals"),
  );
  const grid = sec?.querySelector("div[class*=grid]");
  return [...(grid?.children ?? [])].map((el) => {
    const img = el.querySelector("div[class*=aspect]");
    const btn = el.querySelector("button");
    const ir = img?.getBoundingClientRect();
    const br = btn?.getBoundingClientRect();
    return {
      top: Math.round(el.getBoundingClientRect().top),
      h: Math.round(el.getBoundingClientRect().height),
      imgW: ir ? Math.round(ir.width) : 0,
      imgH: ir ? Math.round(ir.height) : 0,
      btnBottom: br ? Math.round(br.bottom) : 0,
      btnLabel: btn?.textContent?.trim() ?? "",
      text: el.textContent ?? "",
    };
  });
});

ok(cards.length >= 3, `carousel renders ${cards.length} cards`);

const heights = new Set(cards.map((c) => c.h));
ok(heights.size === 1, `all cards share one height (${[...heights].join(", ")})`);

const boxes = new Set(cards.map((c) => `${c.imgW}x${c.imgH}`));
ok(boxes.size === 1, `all image boxes identical (${[...boxes].join(", ")})`);

ok(cards.every((c) => c.imgW > 200),
   `no card collapses when it has no image (min ${Math.min(...cards.map(c=>c.imgW))}px)`);

const rows = new Set(cards.map((c) => c.top));
const bottoms = new Set(cards.map((c) => c.btnBottom));
ok(bottoms.size === rows.size,
   `buttons align per grid row (${rows.size} rows, ${bottoms.size} baselines)`);

ok(cards.every((c) => /Add to cart|Out of stock/.test(c.btnLabel)),
   "every card has a clear call to action");

ok(cards.every((c) => !/৳[\d,.]+\s*[–-]\s*৳/.test(c.text)),
   "cards show a single lowest price, never a range");

const body = await page.textContent("body");
ok(!/\b0\s*(★|stars?)\b/i.test(body), "no stale 0-star ratings rendered");

ok(errors.length === 0, `no runtime errors (${errors.length})`);

await browser.close();
