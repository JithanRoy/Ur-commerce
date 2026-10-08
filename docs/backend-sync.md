# Backend sync

The backend lives in a separate repo and is changed by its own sessions. This
file records which backend commit the frontend has been built against, so
new backend work is never missed.

Last synced backend commit: `e5dfdd2`

## How a sync works

1. List what changed since the commit above:
   `git -C <backend-repo> log --oneline <commit>..HEAD`, plus uncommitted
   work in `git -C <backend-repo> status`.
2. Read the backend's `frontend-handoff/` notes and confirm every shape
   against `http://localhost:3002/api/docs-json` and a live response.
3. Apply any new migrations, update `packages/api-client`, build the
   screens, and run the affected e2e suites.
4. Update the commit above and add a line to the log below. Mark delivered
   items in `docs/backend-requests.md`.

Uncommitted backend work is noted but not built against until it is
committed, because it can still change.

A SessionStart hook (`.claude/hooks/backend-sync.sh`, wired in the local
`.claude/settings.local.json`) reports new backend commits at the start of
every Claude session in this repo.

## Log

| Date | Backend commit | Frontend work |
|---|---|---|
| 2026-09-30 | `d374993` | Hero carousel: storefront carousel and admin manager |
| 2026-10-03 | `b66bcb0` | Production tenant headers (`X-Tenant-Host` + `X-Internal-Key`) from the storefront server; customer order `timeline`; verified CORS `maxAge`, upload `Cache-Control` and safe hero links. Homepage sections (uncommitted backend work) not yet built. |
| 2026-10-03 | `bda44db` | Homepage sections: admin manager (`/sections`, owner-only: add, rename, resize, source, hide, reorder, remove), storefront keys sections on `id`, `best-sellers` sort on the shop page (`soldCount` now increments at checkout). E2E `apps/admin/e2e/homepage-sections.mjs`. |
| 2026-10-03 | `a5414b6` | Customer profile and two-step verification (TOTP) in both apps: sign-in code step (authenticator or recovery code), `/account` pages (details with completion, change password, set up / turn off two-step, recovery codes), owner reminder banner in admin. API client: `rejectsCredentials` so a wrong password or code no longer signs the user out. Google sign-in has a table only — nothing to build. E2E `apps/*/e2e/account-security.mjs`. |
| 2026-10-04 | `820d1ba` | Editor config only (SonarLint in `.vscode/settings.json`) — no frontend work. |
| 2026-10-05 | `babb87b` | Product reviews: stars on cards and the product page, reviews section (summary bars, filter, sort, pages), write/edit/delete for delivered buyers, `/account/reviews` (rate purchases, your reviews), "Rate this item" on delivered orders, `top-rated` sort; admin `/reviews` moderation (hide/restore). Also built against **uncommitted** `brandsEnabled` (store-wide brands switch on Branding; storefront hides brand nav, pages, hero link) — recheck once committed. E2E `storefront/e2e/reviews.mjs`, `admin/e2e/reviews.mjs`, `admin/e2e/brands-toggle.mjs`. |
| 2026-10-05 | `a1ab047` | Brands switch committed; matches what was built against it — no further work. Uncommitted backend work noted, not built: review prompts (`GET /reviews/prompt`, `POST /reviews/prompt/:productId/shown` and `/dismiss`, `GET /reviews/summary`). Review photos requested — no backend support yet (`Review` has no images; uploads are admin-only). |
| 2026-10-05 | `a1ab047` + uncommitted | Reviews from orders and profile, built against **uncommitted** backend work (user asked) — recheck once committed: per-line `items[].review` state and `reviewableCount` on `/orders` → "Write a review" / "You rated ★ · Edit review" on the orders list and order detail, opening a review dialog in place; `GET /reviews/summary` → count badges on the account nav, navbar avatar and account menu, plus a "waiting for your review" nudge; `/account/reviews` now "To review / Reviewed" tabs; `/reviews/prompt` (+ `shown`, `dismiss`) → a non-blocking post-delivery card (not a redirect), quiet on cart/checkout/auth. E2E `storefront/e2e/order-reviews.mjs`. |
| 2026-10-05 | `a1ab047` + uncommitted | Reviews are final once posted: storefront removed Edit/Delete everywhere (product page, account reviews, orders, dialog); form warns before posting. API still allows customer PATCH/DELETE — requested in `backend-requests.md` #6. Order lines now link to the product (resolved via search by name + id match until `productSlug` lands — request #7). |
| 2026-10-08 | `e5dfdd2` | Review state on order lines, `reviewableCount`, `/reviews/summary` and `/reviews/prompt` now committed — matches what was built; `order-reviews.mjs` passes against it. **Review photos** built: picker in the review form (up to 5, previews, retry/remove, client-side shrink to ≤1600px JPEG over 1 MB, server errors shown verbatim), thumbnails + viewer on the product page, account reviews and your-review panel, thumbnails on admin moderation. Photos are set only when posting (reviews are final in the UI). Uncommitted backend work noted, not built: default homepage sections trigger + RLS on `StorefrontSection` (no frontend change needed). E2E `storefront/e2e/review-photos.mjs`. |
