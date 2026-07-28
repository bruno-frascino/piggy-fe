# 0006. Yarn only, no npm/pnpm (piggy-fe)

- **Status**: Accepted
- **Date**: retro-documented 2026-07-28

## Context

Same rationale as `piggy-api/docs/adr/0006-yarn-only.md` — mixing package managers across
contributors/agents produces conflicting lockfiles and inconsistent installed dependency trees
between machines.

## Decision

This repo standardizes on **yarn 1.22.22**, matching `piggy-api`. Only `yarn.lock` is committed. Do
not run `npm install`/`npm ci`/`pnpm install` here, and do not commit `package-lock.json` or
`pnpm-lock.yaml`.

## Consequences

- Agents/scripts must invoke `yarn <script>` (e.g. `yarn dev`, `yarn build`, `yarn test`), not the
  npm equivalent.
- If an npm/pnpm lockfile is ever accidentally created, delete it and reinstall with yarn before
  committing.
