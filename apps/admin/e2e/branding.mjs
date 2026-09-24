import { chromium } from "playwright";
const B = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const browser = await chromium.launch();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const original = await fetch(`${API}/store`, { headers: H }).then((r) => r.json());
const store = original.data;

const page = await (await browser.newContext()).newPage();
await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.fill("#email", "admin@demo.local");
await page.fill("#password", "password123");
await page.click("button[type=submit]");
await page.waitForTimeout(3500);

ok(
  (await page.locator('a[href="/branding"]').count()) > 0,
  "owner sees the Branding nav item",
);

await page.goto(B + "/branding", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

ok(
  (await page.inputValue("#displayName")) === store.storeName,
  "form loads the live store name",
);
ok(
  (await page.inputValue("#primaryColor")) === store.theme.primaryColor,
  "form loads the live primary colour",
);
ok(
  (await page.locator('input[type="color"]').count()) === 2,
  "two colour pickers rendered",
);
ok(
  (await page.innerText("body")).includes("Storefront preview"),
  "live preview is shown",
);

// invalid hex is refused before any request
await page.fill("#primaryColor", "#FFF");
await page.waitForTimeout(400);
let body = await page.innerText("body");
ok(body.includes("six-digit hex"), "short hex rejected client-side");
ok(
  await page.locator('button:has-text("Save branding")').isDisabled(),
  "save is disabled while invalid",
);

// non-https image link refused
await page.fill("#primaryColor", store.theme.primaryColor);
await page.fill("#logoUrl", "http://insecure.test/logo.png");
await page.waitForTimeout(400);
body = await page.innerText("body");
ok(body.includes("https://"), "non-https image link rejected");
await page.fill("#logoUrl", "");

// a real save reaches the API and the public endpoint
const newTagline = `E2E tagline ${Date.now().toString().slice(-5)}`;
await page.fill("#tagline", newTagline);
await page.click('button:has-text("Save branding")');
await page
  .waitForFunction(
    () => document.body.innerText.includes("Branding saved"),
    undefined,
    { timeout: 15000 },
  )
  .then(() => true)
  .catch(() => false);
body = await page.innerText("body");
ok(body.includes("Branding saved"), "save reports success");

const afterSave = await fetch(`${API}/store`, { headers: H }).then((r) => r.json());
ok(
  afterSave.data.tagline === newTagline,
  "public GET /store reflects the change immediately",
);

// clearing an optional field sends null, not ""
await page.fill("#supportPhone", "");
await page.click('button:has-text("Save branding")');
await page.waitForTimeout(3000);
const cleared = await fetch(`${API}/store`, { headers: H }).then((r) => r.json());
ok(cleared.data.supportPhone === null, "cleared optional field becomes null");

// reload shows the persisted values, not local state
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
ok(
  (await page.inputValue("#tagline")) === newTagline,
  "values persist across a reload",
);

// staff must not reach this screen
const staffLogin = await fetch(`${API}/auth/login`, {
  method: "POST", headers: H,
  body: JSON.stringify({ email: "staff@demo.local", password: "password123" }),
}).then((r) => r.json());

if (staffLogin.success) {
  const staffPage = await (await browser.newContext()).newPage();
  await staffPage.goto(B + "/login", { waitUntil: "domcontentloaded" });
  await staffPage.waitForTimeout(1200);
  await staffPage.fill("#email", "staff@demo.local");
  await staffPage.fill("#password", "password123");
  await staffPage.click("button[type=submit]");
  await staffPage.waitForTimeout(3500);
  ok(
    (await staffPage.locator('a[href="/branding"]').count()) === 0,
    "staff does not see the Branding nav item",
  );
  await staffPage.goto(B + "/branding", { waitUntil: "domcontentloaded" });
  await staffPage.waitForTimeout(2500);
  const staffBody = await staffPage.innerText("body");
  ok(
    !staffBody.includes("Storefront preview"),
    "staff cannot use the branding form",
  );
}

// restore
await fetch(`${API}/admin/settings`, {
  method: "PATCH",
  headers: {
    ...H,
    Authorization: `Bearer ${(await fetch(`${API}/auth/login`, {
      method: "POST", headers: H,
      body: JSON.stringify({ email: "admin@demo.local", password: "password123" }),
    }).then((r) => r.json())).data.accessToken}`,
  },
  body: JSON.stringify({
    tagline: store.tagline,
    supportPhone: store.supportPhone,
  }),
});
const restored = await fetch(`${API}/store`, { headers: H }).then((r) => r.json());
ok(restored.data.tagline === store.tagline, "store restored to its original state");

await browser.close();
