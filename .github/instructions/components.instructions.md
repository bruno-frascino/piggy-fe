---
applyTo: 'src/components/**'
---

# Component conventions

- Functional components + hooks only, no class components. Complex effect/memo logic that isn't
  purely presentational belongs in a `use*` hook under `src/hooks/`, not inline in the component
  (see `useHoldingRows.ts`, `useAccountSelection.ts` for the extraction pattern).
- UI library: PrimeReact v10 + PrimeFlex v4 + Primeicons v7 (theme `lara-light-blue`) + Tailwind CSS
  v4. Light-mode-only design tokens (`--tr-*` in `globals.css`) — no dark mode.
- Local state: React `useState` for feature state; no Zustand/Redux. React Context is allowed only
  for cross-cutting UI concerns (e.g. toast notifications via `useToast()`).
- Components call the backend only through hooks in `src/hooks/api.ts` — never import
  `src/lib/api/*` or axios directly into a component.

## Dashboard / portfolio UX rules

- Dashboard is **account-first and position-first**. Don't require a manual "create exchange" step —
  exchange comes from the stock search result when adding a position. Exchanges shown on the
  dashboard are discovered from the user's positions for the selected account.
- Holdings view is available once an account is selected, even with no exchange selected.
- `AccountsBar.tsx` is the single always-visible sticky account switcher (below `TopNav`, shown
  whenever any account exists); `EmptyAccountsState.tsx` renders instead of the whole dashboard when
  there are zero accounts. `DashboardView.tsx` keeps the Add/Rename/Close account dialogs mounted
  unconditionally so they're reachable from both states.
- Comment semantics: opening rationale lives in `position.openReason`; close rationale lives in the
  SELL `transaction.notes`. Don't duplicate the opening comment into `position.notes`.
- Weekly velocity metric ("Gain/Loss per Week") = current return divided by `(days open / 7)`;
  positions with 0 days open render as unavailable, not a divide error.
- Drawdown has two distinct columns, don't conflate them: "Current Drawdown %" (`priceDrawdownPct`,
  live price vs entry, instant) and "Max Drawdown %" (`maxDrawdownPercent`, historical worst, only
  ratchets up, persisted server-side).

## PWA / offline rules

- Prefer patterns appropriate for a PWA: responsive, touch-friendly, works on mobile and desktop.
- Read-only views (portfolio, history) show cached last-successful data plus an explicit stale-data
  indicator when offline. Do not queue or auto-retry offline mutations.
- Never cache authenticated `/api` responses in the service worker's runtime caching config. Clear
  client/query caches on sign-out to avoid stale cross-user data.

## Feedback / errors

- Form-level errors: PrimeReact `<Message severity="error" text={...} />`.
- Global mutation success/error feedback: PrimeReact `<Toast>` via the `useToast()` hook (context
  provider) — don't prop-drill a toast ref.
