import { chromium } from "playwright";

const B = "http://localhost:5273";
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);
const RUN = Math.floor(Math.random() * 90000) + 10000;

const page = await browser.newPage();
await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.fill("#email", "admin@demo.local");
await page.fill("#password", "password123");
await page.click('button[type=submit]');
await page.waitForTimeout(3500);

// --- sidebar module ---
const sidebar = page.locator("aside");
ok(await sidebar.getByRole("button", { name: /Products/ }).isVisible(),
   "sidebar has a Products module");
ok((await sidebar.getByRole("link", { name: "All products" }).count()) === 1,
   "module is expanded on a products route");
for (const child of ["Categories", "Brands", "Collections"]) {
  ok((await sidebar.getByRole("link", { name: child }).count()) === 1,
     `sub-module: ${child}`);
}
await sidebar.getByRole("link", { name: "Categories" }).click();
await page.waitForTimeout(1500);
ok(new URL(page.url()).pathname === "/categories", "sub-module navigates");
ok((await sidebar.getByRole("link", { name: "All products" }).count()) === 1,
   "module stays expanded inside the catalogue");

// --- toast on create ---
await page.getByLabel(/New categor/i).fill(`Toast Cat ${RUN}`);
await page.getByRole("button", { name: "Add" }).click();
await page.waitForTimeout(1500);
const toastText = await page.locator("[data-sonner-toast]").allTextContents();
ok(toastText.some((t) => t.includes(`Toast Cat ${RUN}`)),
   `create shows a toast (${JSON.stringify(toastText).slice(0, 60)})`);

// --- toast on delete ---
await page.getByRole("button", { name: `Delete Toast Cat ${RUN}` }).click();
await page.waitForTimeout(1500);
const toasts2 = await page.locator("[data-sonner-toast]").allTextContents();
ok(toasts2.some((t) => t.includes("Deleted")), "delete shows a toast");

// --- products table ---
await sidebar.getByRole("link", { name: "All products" }).click();
await page.waitForTimeout(2000);
const rows = await page.locator("tbody tr").count();
const thumbBoxes = await page.locator("tbody tr td:first-child span.size-10").count();
ok(rows > 0 && thumbBoxes === rows,
   `every row has a thumbnail box, image or placeholder (${thumbBoxes}/${rows})`);
const bodyText = await page.textContent("tbody");
ok(/\d+ variants?/.test(bodyText), "stock column shows variant count");
ok(bodyText.includes("Category") || (await page.locator("th", { hasText: "Category" }).count()) === 1,
   "category column present");

// --- product-edit save toast ---
await page.locator("tbody tr a").first().click();
await page.waitForTimeout(2500);
const saveDetails = page.getByRole("button", { name: /Save details/i });
if ((await saveDetails.count()) > 0) {
  await saveDetails.click();
  const saw = await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll("[data-sonner-toast]")].some((el) =>
          el.textContent?.includes("Details saved"),
        ),
      undefined,
      { timeout: 10000 },
    )
    .then(() => true)
    .catch(() => false);
  ok(saw, "product save shows a toast");
} else {
  ok(false, "Save details button found");
}

await browser.close();
