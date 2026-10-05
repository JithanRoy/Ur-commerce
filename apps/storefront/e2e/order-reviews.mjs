import { chromium } from "playwright";

const B = "http://localhost:3100";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const SHOPPER = { email: "e2e-security@demo.local", password: "e2e-password-1" };
const SHOT_DIR = process.env.REVIEW_SHOTS;
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

async function deleteMyReviews(token) {
  const mine = await api("/reviews/mine?limit=100", { token });
  for (const review of mine.data?.items ?? []) {
    await api(`/reviews/${review.id}`, { method: "DELETE", token });
  }
}

const login = await api("/auth/login", { method: "POST", body: SHOPPER });
if (!login.success) {
  console.log("✗ test shopper missing — run e2e/reviews.mjs first");
  process.exit(1);
}
const token = login.data.accessToken;
await deleteMyReviews(token);
const product = (await api("/reviews/awaiting", { token })).data?.[0];
if (!product) {
  console.log("✗ test shopper has nothing to review — run e2e/reviews.mjs first");
  process.exit(1);
}
const orders = (await api("/orders?limit=50", { token })).data.items;
const order = orders.find((o) => o.items.some((item) => item.productId === product.id && item.review?.state === "AVAILABLE"));

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) => (SHOT_DIR ? page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: true }) : null);

try {
  await page.goto(`${B}/login?returnTo=${encodeURIComponent("/account")}`, { waitUntil: "networkidle" });
  await page.fill("#email", SHOPPER.email);
  await page.fill("#password", SHOPPER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/account");

  const nav = page.getByRole("navigation", { name: "Account" });
  const reviewsTab = nav.getByRole("link", { name: /Reviews/ });
  await reviewsTab.waitFor();
  await page.getByText(/waiting for your review/).first().waitFor();
  ok(true, "profile shows the review nudge");
  ok(/\d/.test(await reviewsTab.textContent()), "profile nav Reviews tab carries a count");
  ok(/to review/.test(await page.getByRole("button", { name: /Your account/ }).getAttribute("aria-label")), "navbar account button announces items to review");
  await page.getByRole("button", { name: /Your account/ }).click();
  ok(/\d/.test(await page.getByRole("menuitem", { name: /Your reviews/ }).textContent()), "account menu shows the count by Your reviews");
  await page.keyboard.press("Escape");
  await shot("profile-nav");

  await reviewsTab.click();
  await page.waitForURL("**/account/reviews");
  await page.getByRole("tab", { name: /To review/, selected: true }).waitFor();
  ok(true, "reviews page opens on To review");
  await nav.getByRole("link", { name: /Orders/ }).click();
  await page.waitForURL("**/account/orders");

  const card = page.locator("li").filter({ hasText: order.orderNumber }).first();
  await card.waitFor();
  ok(await card.getByText(/\d+ to review/).isVisible(), "order card has a “to review” badge");
  const line = card.locator("li").filter({ hasText: product.name });
  ok(await line.getByRole("link", { name: product.name }).isVisible(), "order line links the product name");
  await shot("orders-before");
  await line.getByRole("button", { name: "Write a review" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByText("Rate your purchase").waitFor();
  ok(new URL(page.url()).pathname === "/account/orders", "review opens in place, no navigation");
  await dialog.getByLabel(/^4 stars/).check({ force: true });
  await dialog.getByLabel("Headline").fill("Fits well");
  await shot("orders-dialog");
  await dialog.getByRole("button", { name: "Post review" }).click();
  await dialog.getByText("Thanks — your review is live.").waitFor();
  ok(true, "review posts from the orders page");
  await dialog.getByRole("button", { name: "Done" }).click();

  await line.getByText("You rated").waitFor();
  ok((await line.getByRole("button", { name: /Edit/ }).count()) === 0, "line switches to “You rated”, with no edit");
  ok((await card.getByText(/\d+ to review/).count()) === 0, "badge clears once reviewed");
  await shot("orders-after");

  await page.goto(`${B}/account/orders/${order.id}`, { waitUntil: "networkidle" });
  const detailLine = page.locator("li").filter({ hasText: product.name }).first();
  await detailLine.getByText("You rated").waitFor();
  ok((await detailLine.getByRole("button", { name: /Edit/ }).count()) === 0, "order detail shows the rating read-only");
  await detailLine.getByRole("link", { name: product.name }).click();
  await page.waitForURL(`**/product/${product.slug}`);
  ok(true, "product name on the order opens the product page");

  const calls = [];
  await page.route("**/api/v1/reviews/prompt", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "ok",
        data: { prompt: { product: { id: product.id, name: product.name, slug: product.slug, images: product.images }, order: { id: order.id, orderNumber: order.orderNumber, deliveredAt: order.deliveredAt } } },
      }),
    }),
  );
  await page.route("**/api/v1/reviews/prompt/*/*", (route) => {
    calls.push(new URL(route.request().url()).pathname.split("/").pop());
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, message: "ok", data: {} }) });
  });
  await page.goto(`${B}/shop`, { waitUntil: "networkidle" });
  const prompt = page.getByRole("complementary", { name: "Review your purchase" });
  await prompt.waitFor();
  ok(await prompt.getByText(order.orderNumber).isVisible(), "post-delivery prompt names the order");
  await page.waitForTimeout(500);
  ok(calls.filter((c) => c === "shown").length === 1, "prompt records “shown” exactly once");
  await shot("prompt");
  await prompt.getByRole("button", { name: "Don't ask again" }).click();
  await page.waitForTimeout(500);
  ok(calls.includes("dismiss") && !(await prompt.isVisible()), "Don't ask again dismisses it");

  await page.goto(`${B}/cart`, { waitUntil: "networkidle" });
  ok((await prompt.count()) === 0, "prompt stays quiet on the cart");

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
  await shot("order-reviews-crash");
} finally {
  await browser.close();
  await deleteMyReviews(token);
  const left = await api("/reviews/mine", { token });
  ok((left.data?.items ?? []).length === 0, "test reviews cleaned up");
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
