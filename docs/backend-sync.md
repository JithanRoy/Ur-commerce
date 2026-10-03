# Backend sync

The backend lives in a separate repo and is changed by its own sessions. This
file records which backend commit the frontend has been built against, so
new backend work is never missed.

Last synced backend commit: `a5414b6`

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
