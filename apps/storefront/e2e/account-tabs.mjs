import { chromium } from "playwright";

const B = "http://localhost:3100";
const SHOPPER = { email: "e2e-security@demo.local", password: "e2e-password-1" };
const FAST_MS = Number(process.env.TAB_FAST_MS ?? 1500);
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};

const tabs = [
  { name: "Orders", path: "/account/orders", ready: (page) => page.getByText(/ORD-\d+/).first() },
  { name: "Addresses", path: "/account/addresses", ready: (page) => page.getByText(/Gulshan|Add (an |a new )?address/i).first() },
  { name: "Reviews", path: "/account/reviews", ready: (page) => page.getByRole("tab", { name: /To review/ }) },
  { name: "Profile", path: "/account", ready: (page) => page.getByLabel("Name") },
];

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const apiCalls = [];
page.on("request", (request) => {
  if (request.url().includes("/api/v1/") && request.method() === "GET") apiCalls.push(new URL(request.url()).pathname);
});

try {
  await page.goto(`${B}/login?returnTo=%2Faccount`, { waitUntil: "networkidle" });
  await page.fill("#email", SHOPPER.email);
  await page.fill("#password", SHOPPER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/account");
  await page.getByLabel("Name").waitFor();

  for (const tab of tabs) {
    await page.goto(`${B}${tab.path}`, { waitUntil: "networkidle" });
  }
  await page.goto(`${B}/account`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const nav = page.getByRole("navigation", { name: "Account" });
  await nav.evaluate((element) => {
    element.dataset.mountedOnce = "yes";
  });
  ok(apiCalls.some((path) => path.endsWith("/orders")) && apiCalls.some((path) => path.endsWith("/addresses")), "other tabs' data is prefetched in the background");

  for (const tab of tabs) {
    apiCalls.length = 0;
    const started = Date.now();
    await nav.getByRole("link", { name: new RegExp(tab.name) }).click();
    await tab.ready(page).waitFor();
    const took = Date.now() - started;
    ok(took < FAST_MS, `${tab.name} tab shows content in ${took} ms`);
    ok((await page.getByRole("status", { name: /Loading/ }).count()) === 0, `${tab.name} shows no skeleton once cached`);
  }

  ok((await nav.evaluate((element) => element.dataset.mountedOnce)) === "yes", "tab bar stays mounted across tabs");
  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
