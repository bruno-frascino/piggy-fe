---
name: align-contract-and-push
description:
  Prepare, commit, and push piggy-api and piggy-fe changes with aligned OpenAPI contracts and
  generated context. Use when the user asks Copilot to push changes or to commit and push either
  repository.
---

# Align contracts before pushing

Follow the shared workflow in `../piggy-api/.github/skills/align-contract-and-push/SKILL.md` from
the frontend repository root. Read it before acting; if the sibling backend checkout or the shared
skill is unavailable, stop and report the blocker. This skill applies to Copilot-assisted pushes,
not manual `git push`.
