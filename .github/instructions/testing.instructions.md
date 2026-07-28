---
applyTo: '**/*.test.tsx'
---

# Test conventions (piggy-fe)

- Runner: Vitest + `@testing-library/react`. Coverage thresholds 60/60/60/45
  (statements/branches/functions/lines), scoped to `src/lib/**` only (`vitest.config.ts`).
- Hooks: test with `QueryClientProvider` wrapping and a mocked Axios instance.
- Components: test with `@testing-library/react`, mocking `src/hooks/api.ts` and/or
  `next/navigation` as needed.
- **Critical gotcha**: never return a fresh object/array literal from a mocked hook/module on every
  call (e.g. `data: []`, `useRouter: () => ({...})`) if the component under test lists that value in
  an effect's dependency array — a new reference each render can loop the effect forever and
  OOM-crash the vitest process. Hoist stable mocks via `vi.hoisted(() => ({...}))` and return the
  same reference every call.
- PrimeReact `InputNumber` does not respond to `fireEvent.change` (it listens to native `onInput`
  via internal keystroke parsing) — seed numeric fields via component `initial`/props instead of
  simulating typing. Plain `InputText` fields work fine with `fireEvent.change`.
- `DashboardView` persists `selectedAccountId` to `localStorage` — call `localStorage.clear()` in
  the test file's `afterEach`, or account-switch state leaks into later tests in the same file.
- Before refactoring any component/hook with no existing test coverage, write characterization tests
  first (capture current behavior), verify green against the unrefactored code, THEN refactor, THEN
  re-run to prove zero behavior change.
- Every new feature, bug fix, or behavior change ships with tests in the same change set.
