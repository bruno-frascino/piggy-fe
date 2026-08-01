# Context maintenance follow-ups

Tracked on 2026-08-01. These items are intentionally deferred; update this document when each item
is verified or resolved.

## API-layer architecture debt

- Replace direct `apiClient` imports in `src/app/history/page.tsx`, `src/components/TopNav.tsx`,
  `src/components/HoldingsTable.tsx`, and `src/components/ReportsView.tsx` with React Query hooks in
  `src/hooks/api.ts`.
- Move direct calls to `getTradingAccounts`, `searchStocks`, and `updatePosition` out of
  `useAccountNameSuggestions.ts`, `useSymbolSearch.ts`, and `useHoldingRows.ts` into the central
  React Query layer so query keys, caching, and invalidation remain consistent.
- Add focused hook/component tests, then remove resolved entries from
  `ACCEPTED_ARCHITECTURE_VIOLATIONS` in `scripts/context/check.ts`. The exact four current
  component/app violations are temporarily accepted; any new violation fails the check.

## Contract freshness

- `yarn context:check` validates the committed vendored contract, not whether it matches the latest
  backend branch. Continue running `yarn contract:pull` after backend API changes.
- Consider a cross-repository contract check or release artifact later. CI intentionally has no
  sibling checkout and cannot run `contract:pull` today.

## Hosted enforcement

- Open a pull request and confirm the PR-only `CI` workflow passes on GitHub-hosted Ubuntu. Local
  lint, test, build, and context checks pass, but the hosted workflow has not run yet.
- After the first successful run, consider making the `CI / Lint, test, build, context:check` check
  required in branch protection. Local Husky hooks can be bypassed and are not an authoritative
  control.

## Generator maintenance

- Review generated context diffs whenever parser/tool versions change. `ts-morph`,
  dependency-cruiser, knip, Next.js, and OpenAPI tooling upgrades can legitimately reshape output.
