import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:3100/product/slim-fit-denim-jeans", { waitUntil: "networkidle" });
await p.click('button[aria-pressed]:has-text("M")'); await p.waitForTimeout(250);
await p.click('button[aria-pressed]:has-text("Indigo")'); await p.waitForTimeout(900);
for (const el of await p.locator('button:has-text("Add to cart")').all()) console.log(JSON.stringify(await el.textContent()), await el.isEnabled());
console.log((await p.innerText("body")).match(/In stock[^\n]*/)?.[0]);
await b.close();
