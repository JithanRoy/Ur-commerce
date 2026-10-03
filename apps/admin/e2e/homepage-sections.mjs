import { chromium } from "playwright";

const B = "http://localhost:5273";
const API = "http://localhost:3002/api/v1";
const H = { "Content-Type": "application/json", "X-Tenant-Host": "demo.localhost" };
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@demo.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "password123";
const SHOT = process.env.SECTIONS_SHOT;
const RUN = Date.now().toString(36);
const TITLE = `E2E Picks ${RUN}`;
const RENAMED = `E2E Renamed ${RUN}`;
let failures = 0;
const ok = (c, n) => {
  if (!c) failures += 1;
  console.log(c ? `✓ ${n}` : `✗ ${n}`);
};

const login = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then((r) => r.json());
if (!login.success) {
  console.log(`✗ owner login failed for ${EMAIL}: ${login.message}`);
  process.exit(1);
}
const AUTH = { ...H, Authorization: `Bearer ${login.data.accessToken}` };

const adminSections = () =>
  fetch(`${API}/admin/sections`, { headers: AUTH }).then((r) => r.json()).then((j) => j.data);
const publicSections = () =>
  fetch(`${API}/home`, { headers: H }).then((r) => r.json()).then((j) => j.data.sections);

const original = await adminSections();
const originalIds = original.map((s) => s.id);

async function restore() {
  const now = await adminSections();
  for (const section of now.filter((s) => !originalIds.includes(s.id))) {
    await fetch(`${API}/admin/sections/${section.id}`, { method: "DELETE", headers: AUTH });
  }
  for (const before of original) {
    const after = now.find((s) => s.id === before.id);
    if (!after) continue;
    const changed = ["title", "source", "itemLimit", "isActive"].some((k) => after[k] !== before[k]);
    if (!changed) continue;
    const { title, itemLimit, isActive, source } = before;
    await fetch(`${API}/admin/sections/${before.id}`, {
      method: "PATCH",
      headers: AUTH,
      body: JSON.stringify({ title, itemLimit, isActive, ...(source ? { source } : {}) }),
    });
  }
  if (originalIds.length > 0) {
    await fetch(`${API}/admin/sections/order`, {
      method: "PUT",
      headers: AUTH,
      body: JSON.stringify({ sectionIds: originalIds }),
    });
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

try {
  await page.goto(B + "/login", { waitUntil: "domcontentloaded" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  await page.getByRole("link", { name: "Homepage sections" }).click();
  await page.waitForURL("**/sections");
  const list = page.getByRole("list", { name: "Homepage sections in display order" });
  await list.waitFor();
  ok((await list.getByRole("listitem").count()) === original.length, `lists all ${original.length} sections in order`);

  for (const kind of ["CATEGORY_GRID", "BRAND_STRIP"]) {
    const label = kind === "CATEGORY_GRID" ? /Category grid/ : /Brand strip/;
    const button = page.getByRole("group", { name: "Section type" }).getByRole("button", { name: label });
    const exists = original.some((s) => s.kind === kind);
    ok((await button.isDisabled()) === exists, `${kind} picker ${exists ? "disabled (already present)" : "enabled"}`);
  }

  await page.getByRole("group", { name: "Section type" }).getByRole("button", { name: /Product row/ }).click();
  await page.selectOption("#new-section-source", "BEST_SELLERS");
  ok(await page.getByText(/Ranked by units sold/).first().isVisible(), "best-sellers hint shown");
  await page.fill("#new-section-title", TITLE);
  await page.getByRole("button", { name: "Add section" }).click();
  await page.getByText(`“${TITLE}” added`).waitFor();
  const card = list.getByRole("listitem").filter({ hasText: TITLE });
  await card.waitFor();
  ok((await list.getByRole("listitem").last().textContent()).includes(TITLE), "new section added last");

  let added = (await adminSections()).find((s) => s.title === TITLE);
  ok(added?.source === "BEST_SELLERS" && added?.kind === "PRODUCT_CAROUSEL", "saved as best-sellers carousel");
  const live = await publicSections();
  ok(live.at(-1)?.id === added?.id && live.at(-1)?.seeAllUrl === "/shop?sort=best-sellers", "storefront /home gets it last with best-sellers link");

  await card.getByRole("button", { name: `Move “${TITLE}” up` }).click();
  await page.getByText("Section order saved.").first().waitFor();
  const afterMove = await adminSections();
  ok(afterMove.at(-2)?.id === added.id, "move up reorders on the server");

  const titleInput = card.getByLabel("Heading");
  await titleInput.fill(RENAMED);
  await titleInput.press("Enter");
  await page.getByText(`Renamed to “${RENAMED}”.`).waitFor();
  const renamedCard = list.getByRole("listitem").filter({ hasText: RENAMED });

  await renamedCard.getByLabel("How many").selectOption("6");
  await page.getByText(/now shows up to 6 items/).waitFor();

  await renamedCard.getByLabel("Show on homepage").uncheck();
  await page.getByText(`“${RENAMED}” is hidden from your homepage.`).waitFor();
  added = (await adminSections()).find((s) => s.id === added.id);
  ok(added.title === RENAMED && added.itemLimit === 6 && added.isActive === false, "rename, limit and hide saved");
  ok(!(await publicSections()).some((s) => s.id === added.id), "hidden section dropped from storefront /home");

  if (SHOT) await page.screenshot({ path: SHOT, fullPage: true });

  await renamedCard.getByRole("button", { name: `Remove “${RENAMED}”` }).click();
  await renamedCard.getByRole("button", { name: "Remove section" }).click();
  await page.getByText(`“${RENAMED}” removed`).waitFor();
  ok(!(await adminSections()).some((s) => s.id === added.id), "section removed");

  ok(pageErrors.length === 0, `no page errors${pageErrors.length ? `: ${pageErrors.join(" | ")}` : ""}`);
} catch (error) {
  failures += 1;
  console.log(`✗ crashed: ${error.message.split("\n")[0]}`);
} finally {
  await restore();
  const finalIds = (await adminSections()).map((s) => s.id);
  ok(JSON.stringify(finalIds) === JSON.stringify(originalIds), "sections restored to original state");
  await browser.close();
}

console.log(failures ? `\n${failures} failure(s)` : "\nAll passed");
process.exit(failures ? 1 : 0);
