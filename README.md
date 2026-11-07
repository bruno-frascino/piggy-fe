# piggy-fe

Frontend for **Truffles** — a personal stock portfolio tracker supporting equities, ETFs, and crypto
across multiple exchanges. This is the Next.js (App Router) web app; the sibling `../piggy-api` repo
is the Express/PostgreSQL backend it talks to.

For AI-agent context (architecture, hard rules, key directories), see [`AGENTS.md`](./AGENTS.md).

## Portfolio accounting: current features and next steps

The shared [foundation plan](../piggy-api/docs/portfolio-foundation-plan.md) is the canonical
step-by-step delivery checklist;
[ADR 0016](../piggy-api/docs/adr/0016-portfolio-accounting-foundation.md) defines accounting rules.
Resume from its remaining increment 2 steps, not from older historical progress notes.

- **Opening review:** select a real account and use "Opening-balance preview", then optionally "Save
  inactive draft". Reconciliation includes exact draft cash, funding gaps, source/parcel
  differences, user-attested evidence and supported manual/Kraken cash staging. Draft capital
  corrections/reversals are inactive; nothing here activates accounting or creates spendable cash.
- **Audited execution corrections:** eligible ledger-backed holdings/history expose manual
  acquisition and sale controls and restricted imported Kraken corrections. Acquisition inputs use
  total bought units and full exact fees, not remaining units or prorated fees.
- **Manual voids:** the holdings editor exposes "Void acquisition"; the history editor exposes
  eligible "Void sale"/"Void acquisition" actions. A BUY requires no effective sales; a SELL
  restores units and removes proceeds only if the full dated cash timeline remains funded. These
  terminal actions retain original records and require an audit reason and financial
  acknowledgement.
- **Retained audit history:** on History, select a real account and expand "View retained void
  audits". This paginated read view also works on archived ledger-backed accounts; it is separate
  from effective disposal history and does not certify current reconciliation/source freshness. Void
  submissions are blocked offline, in privacy mode and after stale/conflicting review.
- **Tax and current results:** voided effects are excluded from holdings, disposals and current
  CGT/statistics. Already generated PDFs remain unchanged; affected reports may need regeneration.

Live controls require a confirmed opening statement and active real ledger already provisioned on
the backend. **No user-facing activation exists.** Legacy/demo accounts retain existing workflows;
demos remain excluded from real aggregates and tax. Imported voids, financial moves and
protected-record deletion remain blocked.

Next: live deposits/withdrawals and their audited revisions, cash balances/activity/evidence review,
explicit backend-capability-based ordinary trade routing, then controlled per-account confirmation.
Income/transfers, sourced valuations and TWR/XIRR follow later. Existing portfolio curves and
trading statistics must not be described as cash-inclusive accounting-backed returns.

### Keeping each milestone aligned

Land tested backend routes/migrations/Swagger and generated context first. Then:

```bash
yarn contract:pull     # pull from the committed sibling backend
yarn test --run
yarn lint
yarn build
yarn context:build
yarn contract:check
yarn context:check
```

Update handwritten `src/lib/types.ts`, relevant UI/API/hooks/tests and this feature summary when
behavior changes. Generated API types remain reference-only. Update shared delivery status/policy in
the backend plan/ADR rather than maintaining a second frontend roadmap.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · PrimeReact + PrimeFlex + Tailwind CSS · TanStack
React Query · Axios · Chart.js · `@ducanh2912/next-pwa`. Tested with Vitest +
`@testing-library/react`. Linted with ESLint + Prettier + lint-staged/Husky.

## Getting started

Requires Node 22 (see `.nvmrc`) and **yarn** (this repo is yarn-only — do not use npm/pnpm; see
`docs/adr/0006-yarn-only.md`).

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable              | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL of `piggy-api` (default `http://localhost:4000/api`) |

## Scripts

```bash
yarn dev              # start dev server
yarn build             # production build
yarn start             # run a production build locally
yarn test              # vitest (watch mode)
yarn test --run        # vitest, single pass
yarn test:coverage     # vitest --coverage --run
yarn lint              # eslint .
yarn format             # prettier --write .
```

## Project structure

```
src/
  app/           # Next.js App Router pages (auth/, history/, reports/, account/, offline/)
  components/    # PrimeReact-based shared UI components
  hooks/         # React Query hooks (api.ts) + extracted view-logic hooks
  lib/           # api-client facade, api/* HTTP modules, types.ts, format.ts
docs/adr/        # Architecture decision records
```

## Deployment

Deployed on Vercel (custom domain `app.trufflesinvestment.com.au`). See
`../piggy-api/docs/deployment.md` for the full production topology (this app + the VPS-hosted API).
