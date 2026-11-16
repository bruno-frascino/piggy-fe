# piggy-fe

Frontend for **Truffles** — a personal stock portfolio tracker supporting equities, ETFs, and crypto
across multiple exchanges. This is the Next.js (App Router) web app; the sibling `../piggy-api` repo
is the Express/PostgreSQL backend it talks to.

For AI-agent context (architecture, hard rules, key directories), see [`AGENTS.md`](./AGENTS.md).

## Portfolio accounting: current features and next steps

The shared [foundation plan](../piggy-api/docs/portfolio-foundation-plan.md) is the canonical
step-by-step delivery checklist;
[ADR 0016](../piggy-api/docs/adr/0016-portfolio-accounting-foundation.md) defines accounting rules.
Resume from its current status register, not from older historical progress notes.

- **Opening review:** select a real account and use "Opening-balance preview", then optionally "Save
  inactive draft". Reconciliation includes exact draft cash, funding gaps, source/parcel
  differences, user-attested evidence and supported manual/Kraken cash staging. Draft capital
  corrections/reversals are inactive. The reconciliation panel exposes confirmation blockers and any
  other draft activity that will remain excluded. An eligible latest draft can be confirmed only
  after four explicit acknowledgements; this enables the cash ledger for that account alone.
  Confirmation is online-only, retry-safe, and does not carry any draft activity forward.
- **Audited execution corrections:** eligible ledger-backed holdings/history expose manual
  acquisition and sale controls and restricted imported Kraken corrections. Acquisition inputs use
  total bought units and full exact fees, not remaining units or prorated fees.
- **Manual voids:** the holdings editor exposes "Void acquisition"; the history editor exposes
  eligible "Void sale"/"Void acquisition" actions. A BUY requires no effective sales; a SELL
  restores units and removes proceeds only if the full dated cash timeline remains funded. These
  terminal actions retain original records and require an audit reason and financial
  acknowledgement.
- **Live funding entry:** active real accounts expose a separate deposit/withdrawal form. It records
  the exact positive amount, currency, effective date/sequence and source reference through the
  cash-only API; retries retain their idempotency key and offline submissions are never queued. The
  backend requires an already confirmed active ledger, so this control does not activate an account
  or create a synthetic trade.
- **Manual income receipts (increment 3A, complete):** users can record statement-supported
  equity/ETF cash distributions with entitlement/payment dates, gross, withholding,
  franked/unfranked amounts, franking credits and source reference. Only net cash is posted. Audited
  replacement and terminal reversal retain the original command and postings; replacements preserve
  asset, currency and source reference. Reverse and record again to correct those identity fields.
  Complex AMIT, estimates and crypto staking are not supported, and posted receipts are never
  directly editable or deletable.
- **Paired cash transfers:** "Transfer cash" records same-currency cash between two owned active
  confirmed real ledgers, on the same date with separate account sequences and a sender-paid fee.
  Principal is external to either account and cancels across both; fees remain costs. Both account
  cash/audit/capability caches refresh after the atomic posting. The form requires online capability
  checks, statement reference and acknowledgement of the paired audited workflow. Live cash review
  retains the endpoint IDs and fee charged to each account. No holdings, FX, recipient-side fees,
  untracked endpoints or automatic account activation are supported.
- **Paired transfer corrections:** sender-side live cash review opens a review of both active
  ledgers. Principal, sender fee, shared date and both sequences may change; accounts, currency and
  source reference stay fixed. A reason, both current heads and paired acknowledgement are required.
  Terminal reversal removes the original economic effect including fees; both timelines must remain
  funded and original/replacement slots remain reserved. The form preserves identical retry keys,
  refreshes both account caches, and blocks offline, privacy, pending and stale/error review
  submissions. "Refresh both review heads" remains available after a review error. Direct and
  one-sided revisions are unsupported.
- **Explicit FX entry:** "Record FX conversion" records an already executed broker exchange within
  the selected active confirmed real account. Enter the exact exchanged and gross received amounts
  before fees, date/sequence and statement reference. Fees may be in either exchanged currency;
  third-currency fees are unsupported. Both currency openings and funded dated replay are required.
  The online-only, privacy/capability/pending-gated form retains identical retry keys and refreshes
  account cash/review/capability caches. Live cash review displays both amounts and fees, masked in
  privacy mode. No live exchange, inferred market rate, automatic funding, holdings change or
  activation occurs.
- **Audited FX revisions:** live cash review opens "Correct or reverse FX conversion" for an
  effective FX operation on a fresh active ledger. Account, currency direction and statement source
  are fixed; exact exchanged amounts, fees, date and sequence may change with a reason,
  acknowledgement and current revision/audit/fingerprint. Both dated currency balances must stay
  funded. Terminal reversal removes the effective conversion including fees, not a new reverse
  exchange. Original/revision audits and historical slots remain retained. Identical retry keys
  survive ambiguous errors. Offline/privacy/pending/stale/error reviews block writes; conflicts
  require "Refresh FX review head", and refreshed heads reset the form. Identity mistakes require
  reversal and a new record; generic funding corrections remain unsupported.
- **Live funding corrections:** the funding panel shows original and current effective amounts,
  dates and retained signed reversal/replacement legs. Corrections require a reason and current
  audit head; terminal reversals require acknowledgement and are blocked if later cash would become
  unfunded. These mutations are online-only.
- **Dividend reinvestment:** "Record dividend reinvestment" records a new statement-supported
  equity/ETF distribution and a separate BUY parcel atomically in the same account/currency. Enter
  exact income/tax figures, entitlement/payment/acquisition dates and sequences, units, unit price,
  fees and residual cash actually paid into the account. Net income must fund the entire acquisition
  and residual without rounding consideration or adding funding. Issuer-held carry-forward, existing
  receipts/BUYs, cross-currency purchases and complex AMIT components are unsupported. Statement
  acknowledgement and fresh online eligibility for both dates are required; privacy, pending,
  stale/error eligibility and legacy accounts block entry. Identical retries retain their key. Live
  cash review shows both operation links, the new parcel, acquisition date/units and account-cash
  residual, masking amounts in privacy mode. Linked income cannot be revised independently. Live
  cash review opens paired correction/reversal: fixed identity, both current heads, reason and
  acknowledgement are required. Effective sales must be voided first; reversal is terminal. Exact
  retries are retained and conflicts require an explicit refresh that resets the form.
- **Live cash review:** "Live cash review" shows exact balances by currency, dated activity, the
  end-of-day opening boundary, source freshness, unsupported events and retained operation
  revisions. It compares retained user-attested statement balances with the dated replay; this is
  not broker verification. Archived ledger accounts remain read-only. Cached review data can be
  viewed offline with an explicit stale-data warning; writes are never queued.
- **Ordinary trade entry:** BUY and partial/full SELL forms resolve backend capability for the
  selected account and effective date. Ledger-backed accounts use the coordinated cash writer;
  legacy/demo accounts keep their existing supported flows. Unknown, blocked, archived and offline
  live writes fail closed and are never queued.
- **Retained audit history:** on History, select a real account and expand "View retained void
  audits". This paginated read view also works on archived ledger-backed accounts; it is separate
  from effective disposal history and does not certify current reconciliation/source freshness. Void
  submissions are blocked offline, in privacy mode and after stale/conflicting review.
- **Tax and current results:** voided effects are excluded from holdings, disposals and current
  CGT/statistics. Already generated PDFs remain unchanged; affected reports may need regeneration.

Live writes require a confirmed opening statement and active real ledger; the explicit reviewed
confirmation flow is the only user-facing way to enable one eligible real account. Saving a draft,
reviewing it, looking up capability or entering a trade never activates accounting. Read-only cash
review can also inspect archived ledger accounts. Legacy/demo accounts retain existing workflows;
demos remain excluded from real aggregates and tax. Imported voids, financial moves and
protected-record deletion remain blocked.

Next: implement the approved stock-split/consolidation posting and history slice; no
corporate-action UI or posting is available yet. Sourced valuations and TWR/XIRR follow later.
Existing portfolio curves and trading statistics must not be described as cash-inclusive
accounting-backed returns.

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
