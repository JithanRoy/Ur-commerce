import { chromium } from "playwright";

const B = "http://localhost:3100";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const SHOPPER = { email: "e2e-security@demo.local", password: "e2e-password-1", name: "Security Tester" };
const OWNER = { email: process.env.ADMIN_EMAIL ?? "admin@demo.local", password: process.env.ADMIN_PASSWORD ?? "password123" };
const SHOT_DIR = process.env.REVIEW_SHOTS;
const RUN = Date.now().toString(36);
const DELIVERY_PATH = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
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

async function login({ email, password }) {
  const result = await api("/auth/login", { method: "POST", body: { email, password } });
  if (!result.success || !result.data.accessToken) throw new Error(`login failed for ${email}: ${result.message}`);
  return result.data.accessToken;
}

async function deliveredProductFor(shopperToken, ownerToken) {
  const awaiting = await api("/reviews/awaiting", { token: shopperToken });
  if (awaiting.data?.length) return awaiting.data[0];

  const catalogue = await api("/products?limit=100");
  const product = catalogue.data.items
    .map((item) => ({ item, variant: [...item.variants].sort((a, b) => b.stock - a.stock)[0] }))
    .filter(({ variant }) => variant && variant.stock > 5)
    .sort((a, b) => b.variant.stock - a.variant.stock)[0];
  if (!product) throw new Error("no product with spare stock to order");

  await api("/cart", { method: "DELETE", token: shopperToken });
  await api("/cart/items", { method: "POST", token: shopperToken, body: { variantId: product.variant.id, quantity: 1 } });
  let addresses = (await api("/addresses", { token: shopperToken })).data;
  if (!addresses.length) {
    await api("/addresses", {
      method: "POST",
      token: shopperToken,
      body: { fullName: SHOPPER.name, phone: "01712345678", division: "Dhaka", district: "Dhaka", thana: "Gulshan", addressLine: "Road 1, House 1" },
    });
    addresses = (await api("/addresses", { token: shopperToken })).data;
  }
  const order = await api("/checkout", { method: "POST", token: shopperToken, body: { addressId: addresses[0].id, paymentMethod: "CASH_ON_DELIVERY" } });
  if (!order.success) throw new Error(`checkout failed: ${order.message}`);
  let status = order.data.status;
  for (const next of DELIVERY_PATH.slice(DELIVERY_PATH.indexOf(status) + 1)) {
    const moved = await api(`/admin/orders/${order.data.id}/status`, { method: "PATCH", token: ownerToken, body: { status: next } });
    if (!moved.success) throw new Error(`could not move order to ${next}: ${moved.message}`);
    status = next;
  }
  console.log(`  (created delivered order ${order.data.orderNumber} for ${product.item.name})`);
  const after = await api("/reviews/awaiting", { token: shopperToken });
  return after.data[0];
}

async function deleteMyReviews(token) {
  const mine = await api("/reviews/mine?limit=100", { token });
  for (const review of mine.data?.items ?? []) {
    await api(`/reviews/${review.id}`, { method: "DELETE", token });
  }
}

await api("/auth/register", { method: "POST", body: SHOPPER });
const shopperToken = await login(SHOPPER);
const ownerToken = await login(OWNER);
await deleteMyReviews(shopperToken);
const product = await deliveredProductFor(shopperToken, ownerToken);
if (!product) {
  console.log("✗ no delivered product available for the test shopper");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const productUrl = `${B}/product/${product.slug}`;
const shot = (name) => (SHOT_DIR ? page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: true }) : null);

try {
  await page.goto(productUrl, { waitUntil: "networkidle" });
  const reviews = page.locator("#reviews");
  await reviews.waitFor();
  ok(await reviews.getByRole("link", { name: "Sign in to review" }).isVisible(), "signed-out shoppers are asked to sign in to review");

  await page.goto(`${B}/login?returnTo=${encodeURIComponent(`/product/${product.slug}`)}`, { waitUntil: "networkidle" });
  await page.fill("#email", SHOPPER.email);
  await page.fill("#password", SHOPPER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`**/product/${product.slug}`);

  const panel = page.locator("#write-review");
  await panel.getByText("Write a review").waitFor();
  ok(true, "a delivered buyer gets the review form");
  await panel.getByRole("button", { name: "Post review" }).click();
  ok(await panel.getByText("Choose from 1 to 5 stars.").isVisible(), "stars are required");

  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label")?.startsWith("1 star"));
  ok(true, "a missing rating moves focus to the stars");
  await page.keyboard.press("Space");
  for (let step = 0; step < 3; step += 1) await page.keyboard.press("ArrowRight");
  ok(await panel.getByLabel(/^4 stars/).isChecked(), "stars can be chosen with the keyboard");
  ok(await panel.getByText("Very good").isVisible(), "star choice is described in words");
  await panel.getByLabel("Headline").fill(`Good fit ${RUN}`);
  await panel.getByLabel("Your review").fill("Soft fabric.\nOrdered my usual size.");
  await shot("review-form");
  await panel.getByRole("button", { name: "Post review" }).click();
  await panel.getByText("Thanks — your review is live.").waitFor();
  ok(true, "review posts and shows straight away");

  const posted = reviews.locator("article").filter({ hasText: `Good fit ${RUN}` });
  await posted.waitFor();
  ok(await posted.getByText("Security T.").isVisible(), "author shown as first name + initial");
  ok(await posted.getByText("Verified purchase").isVisible(), "verified purchase badge");
  ok((await posted.locator("p.whitespace-pre-line").textContent()).includes("\n"), "line breaks kept as plain text");
  ok(await page.getByRole("link", { name: /Rated .* out of 5 from \d+ review/ }).isVisible(), "rating line by the title updates");
  await shot("review-posted");

  ok((await panel.getByRole("button", { name: /Edit|Delete/ }).count()) === 0, "posted review offers no edit or delete");
  const mine = await api("/reviews/mine", { token: shopperToken });
  const saved = mine.data.items.find((review) => review.productId === product.id);
  ok(saved?.rating === 4 && saved.title === `Good fit ${RUN}`, "review saved as posted");

  await api(`/admin/reviews/${saved.id}/status`, { method: "PATCH", token: ownerToken, body: { status: "REJECTED" } });
  await page.goto(`${B}/account/reviews`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Your reviews", level: 2 }).waitFor();
  ok(await page.getByText("This review isn't shown on the store.").isVisible(), "a hidden review is explained to its author");
  const publicList = await api(`/products/${product.slug}/reviews`);
  ok(!publicList.data.items.some((review) => review.id === saved.id), "hidden review is gone from the public list");
  await api(`/admin/reviews/${saved.id}/status`, { method: "PATCH", token: ownerToken, body: { status: "APPROVED" } });

  await page.reload({ waitUntil: "networkidle" });
  const row = page.locator("li").filter({ hasText: product.name }).first();
  await row.waitFor();
  ok((await row.getByRole("button", { name: /Edit|Delete/ }).count()) === 0, "account review list is read-only");

  await api(`/reviews/${saved.id}`, { method: "DELETE", token: shopperToken });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Rate it" }).first().click();
  ok(await page.getByText("Tap to rate").first().isVisible() && await page.getByText(/can't be edited or deleted/).first().isVisible(), "inline form opens and warns reviews are final");

  await page.goto(`${B}/shop?sort=top-rated`, { waitUntil: "networkidle" });
  ok(await page.getByRole("link", { name: "Top rated" }).isVisible(), "Top rated sort is offered");

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
  await shot("review-crash");
} finally {
  await browser.close();
  await deleteMyReviews(shopperToken);
  const left = await api("/reviews/mine", { token: shopperToken });
  ok((left.data?.items ?? []).length === 0, "test reviews cleaned up");
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
