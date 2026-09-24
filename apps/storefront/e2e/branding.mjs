import { chromium } from "playwright";
const B = "http://localhost:3100";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const ok = (c, n) => console.log(c ? `✓ ${n}` : `✗ ${n}`);

const login = await fetch(`${API}/auth/login`, {
  method: "POST", headers: H,
  body: JSON.stringify({ email: "admin@demo.local", password: "password123" }),
}).then((r) => r.json());
const auth = { ...H, Authorization: `Bearer ${login.data.accessToken}` };

const original = await fetch(`${API}/store`, { headers: H }).then((r) => r.json());
const store = original.data;

const readTheme = () =>
  page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      title: document.title,
      hue: cs.getPropertyValue("--brand-hue").trim(),
      accentHue: cs.getPropertyValue("--accent-hue").trim(),
      onPrimaryL: cs.getPropertyValue("--on-primary-l").trim(),
    };
  });

await page.goto(B + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
let t = await readTheme();

ok(t.title === store.storeName, `page title is the store name (${t.title})`);
ok(
  (await page.innerText("header")).includes(store.storeName),
  "header shows the store name",
);
ok(t.hue === "186", `primary hex converted to oklch hue (${t.hue} from #0F766E)`);
ok(t.accentHue === "70", `accent hex converted to oklch hue (${t.accentHue})`);

const bodyText = await page.innerText("body");
ok(bodyText.includes(store.tagline), "tagline from the API is rendered");
ok(
  bodyText.includes(store.supportEmail),
  "support email shown in the footer",
);
ok(bodyText.includes(store.supportPhone), "support phone shown in the footer");
ok(!bodyText.includes("Shipping"), "dead Help links removed");

// changing the colour in admin must reach the storefront
await fetch(`${API}/admin/settings`, {
  method: "PATCH", headers: auth,
  body: JSON.stringify({ primaryColor: "#B91C1C" }),
});
await page.goto(B + "/?cachebust=" + Date.now(), { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
t = await readTheme();
ok(t.hue !== "186", `a colour change reaches the storefront (hue now ${t.hue})`);

// a pale colour must flip the derived text contrast
await fetch(`${API}/admin/settings`, {
  method: "PATCH", headers: auth,
  body: JSON.stringify({ primaryColor: "#FDE68A" }),
});
await page.goto(B + "/?cachebust=" + Date.now(), { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
t = await readTheme();
ok(
  t.onPrimaryL === "0.18",
  `pale brand colour uses dark button text (onPrimaryL=${t.onPrimaryL})`,
);

// restore
await fetch(`${API}/admin/settings`, {
  method: "PATCH", headers: auth,
  body: JSON.stringify({
    primaryColor: store.theme.primaryColor,
    accentColor: store.theme.accentColor,
  }),
});
await page.goto(B + "/?cachebust=" + Date.now(), { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
t = await readTheme();
ok(t.hue === "186", "original brand colour restored");

await browser.close();
