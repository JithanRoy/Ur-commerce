@AGENTS.md

## Claude Code specifics

Everything about the project — structure, rules, running, hosting, how to
change things — lives in `AGENTS.md`, imported above, so every AI tool reads
the same instructions. Edit `AGENTS.md`, not this file, for anything that is
not Claude-specific.

- **Backend sync hook.** `.claude/hooks/backend-sync.sh` (wired in
  `.claude/settings.local.json`) reports new backend commits at session
  start. Follow `docs/backend-sync.md` when it does.
- **Backend repo.** `~/Projects/Backend-dev/shopno-puron-ecommerce` is added
  as a working directory. Read it to understand the API; never edit it.
- **Subagents** in `.claude/agents/`: `develop` (cross-app features),
  `storefront-ui`, `admin-ui`, `api-client`, `qa` (e2e), `frontend-reviewer`,
  `perf-security`, `gap-research` (what the backend really provides).
- **Never** run `git commit`, `git push` or `git add` here (see Working
  agreements in `AGENTS.md`).
