import { chromium } from "playwright";

const B = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const SHOPPER = { email: "e2e-security@demo.local", password: "e2e-password-1" };
const OWNER = { email: process.env.ADMIN_EMAIL ?? "admin@demo.local", password: process.env.ADMIN_PASSWORD ?? "password123" };
const SHOT = process.env.REVIEWS_SHOT;
const RUN = Date.now().toString(36);
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};

async function api(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { ...H, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

const shopperLogin = await api("/auth/login", { method: "POST", body: SHOPPER });
if (!shopperLogin.success) {
  console.log("✗ test shopper missing — run apps/storefront/e2e/reviews.mjs first");
  process.exit(1);
}
const shopperToken = shopperLogin.data.accessToken;
const awaiting = await api("/reviews/awaiting", { token: shopperToken });
const product = awaiting.data?.[0];
if (!product) {
  console.log("✗ test shopper has no delivered product to review — run apps/storefront/e2e/reviews.mjs first");
  process.exit(1);
}
const title = `Moderation check ${RUN}`;
const created = await api("/reviews", {
  method: "POST",
  token: shopperToken,
  body: { productId: product.id, rating: 2, title, body: "Seam came loose after one wash." },
});
if (!created.success) {
  console.log(`✗ could not create a test review: ${created.message}`);
  process.exit(1);
}
const reviewId = created.data.id;

const publicSummary = async () =>
  (await api(`/products/${product.slug}/reviews`)).data.summary.count;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

try {
  const countBefore = await publicSummary();
  await page.goto(`${B}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", OWNER.email);
  await page.fill("#password", OWNER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  await page.getByRole("link", { name: "Reviews" }).click();
  await page.waitForURL("**/reviews");
  const card = page.locator("li").filter({ hasText: title });
  await card.waitFor();
  ok(await card.getByText("Published").isVisible(), "new review shows as published");
  ok(await card.getByText("e2e-security@demo.local").isVisible(), "staff see the customer's email");
  ok(await card.getByText(/Shown as “Security T\.”/).isVisible(), "staff see how the name appears publicly");
  ok(await card.getByRole("link", { name: "View order" }).isVisible(), "links to the order");
  if (SHOT) await page.screenshot({ path: SHOT, fullPage: true });

  await card.getByRole("button", { name: "Hide" }).click();
  await page.getByText(/Review hidden/).first().waitFor();
  ok(await card.getByText("Hidden").first().isVisible(), "hiding updates the card");
  ok((await publicSummary()) === countBefore - 1, "hidden review leaves the product's count");

  await page.getByRole("button", { name: "Hidden", exact: true }).click();
  await page.waitForURL("**/reviews?status=REJECTED");
  ok(await page.locator("li").filter({ hasText: title }).isVisible(), "Hidden filter lists it");

  await page.locator("li").filter({ hasText: title }).getByRole("button", { name: "Restore" }).click();
  await page.getByText("Review restored to the store.").first().waitFor();
  ok((await publicSummary()) === countBefore, "restoring puts it back in the count");

  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.waitForURL((url) => !url.search.includes("status="));
  await page.getByLabel("Filter by rating").selectOption("2");
  await page.locator("li").filter({ hasText: title }).waitFor();
  ok(true, "rating filter finds the 2-star review");

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
} finally {
  await browser.close();
  const removed = await api(`/reviews/${reviewId}`, { method: "DELETE", token: shopperToken });
  ok(removed.success, "test review deleted");
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
