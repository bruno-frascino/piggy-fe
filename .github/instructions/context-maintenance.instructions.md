---
applyTo: '**'
---

# Context maintenance

- After changing anything under `src/` (a new route, hook, component, or query key), run
  `yarn context:build` and commit the resulting `context/` diff in the same change set.
- Never hand-edit files under `context/` — they are regenerated wholesale by `scripts/context/*.ts`
  and any manual edit will be silently overwritten (and will make `yarn context:check` report false
  drift in the meantime).
- If the backend's API surface changed: run `yarn contract:pull` (dev-machine only — requires a
  sibling `piggy-api` checkout, or `PIGGY_API_PATH` set) BEFORE `yarn context:build`, so
  `contracts/openapi.json`, `src/lib/generated/api-types.ts`, and `context/contract-drift.md` all
  reflect the new contract. `yarn context:build` alone never touches `contracts/` — that's
  `contract:pull`'s job. `yarn contract:check` compares the committed contract with a backend
  checkout without writing files; pre-push uses the sibling checkout and CI sparsely checks out the
  backend contract.
- Never import `src/lib/generated/api-types.ts` from app code — it's reference-only (enforced by an
  ESLint `no-restricted-imports` rule). Update `src/lib/types.ts` by hand instead (see
  `docs/adr/0007-manual-types-mirror.md`); check `context/contract-drift.md` after a `context:build`
  to see if it drifted from the OpenAPI contract.
- `yarn context:check` verifies freshness without writing anything — run it if you're not sure
  whether `context/` is stale. It's what the pre-push hook and CI's context-drift job run; a stale
  `context/` blocks `git push` (escape hatch: `CONTEXT_SKIP=1 git push`, not recommended).
- `yarn contract:check` verifies cross-repository contract freshness without writing anything. A
  mismatch blocks local push and frontend CI (escape hatch: `CONTRACT_SKIP=1 git push`, not
  recommended; CI has no bypass).
- A non-zero exit from `yarn context:build` can also mean a real architecture-rule violation was
  found (see `context/module-graph.md`), not just staleness — read the console output to tell which
  case applies before assuming it's just a rebuild.
- Review generated context diffs whenever TypeScript, ts-morph, dependency-cruiser, knip, Next.js,
  OpenAPI, or related parser/generator dependencies change; version upgrades can legitimately
  reshape deterministic output.
