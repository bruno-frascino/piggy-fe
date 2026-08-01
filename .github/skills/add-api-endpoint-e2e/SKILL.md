---
name: add-api-endpoint-e2e
description:
  Add a new REST API endpoint end-to-end across piggy-api and piggy-fe — backend route, Swagger
  docs, frontend API module, React Query hook, and tests on both sides. Use when the user asks to
  add/expose a new backend endpoint that the frontend will consume.
---

# Add a new API endpoint end-to-end

This repo is `piggy-fe` (frontend). A matching skill lives in
`../piggy-api/.github/skills/add-api-endpoint-e2e/SKILL.md` for the backend half. The backend
endpoint must land first — see `AGENTS.md`'s cross-repo ordering rule.

## Frontend steps (this repo)

1. **Contract** (once Phase 3 tooling lands): run `yarn contract:pull` to vendor the latest
   `piggy-api/context/openapi.json` into `contracts/openapi.json`, then check
   `context/contract-drift.md` for any new/changed fields relevant to this endpoint.
2. **API module**: add the new call in the relevant `src/lib/api/*.ts` domain module (e.g.
   `positions.ts`, `stocks.ts`) using the shared axios instance from `http.ts` — never call axios
   directly from a component. Export it through the `apiClient` facade in `src/lib/api-client.ts` if
   it isn't auto re-exported already.
3. **Types**: add/update the matching interface in `src/lib/types.ts` (the manually mirrored source
   of truth — see ADR 0007). Cross-check against `piggy-api/prisma/schema.prisma` for the real
   shape.
4. **Hook**: add a React Query hook (query or mutation) in `src/hooks/api.ts`, with a query key
   following the existing catalog conventions and correct `invalidateQueries` wiring for any
   mutation. Components must call this hook, never the api module directly.
5. **Component wiring**: consume the hook from the relevant component(s) under `src/components/` or
   `src/app/**`, following `.github/instructions/components.instructions.md`.
6. **Tests**: add/extend tests for the hook (mocked axios + `QueryClientProvider`) and any component
   behavior change, per `.github/instructions/testing.instructions.md` — watch for the `vi.hoisted`
   stable-mock-reference gotcha documented there.
7. **Context** (once Phase 2 tooling lands): run `yarn context:build` so `context/api-binding.md`
   picks up the new endpoint↔hook↔query-key mapping.
8. Verify: `yarn lint && yarn test --run && yarn build`.
