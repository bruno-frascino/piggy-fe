# piggy-fe

Frontend for **Truffles** — a personal stock portfolio tracker supporting equities, ETFs, and crypto
across multiple exchanges. This is the Next.js (App Router) web app; the sibling `../piggy-api` repo
is the Express/PostgreSQL backend it talks to.

For AI-agent context (architecture, hard rules, key directories), see [`AGENTS.md`](./AGENTS.md).

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
