# 0007. Manual `types.ts` mirror kept as source of truth; generated types reference-only

- **Status**: Accepted
- **Date**: 2026-07-27

## Context

`piggy-api/prisma/schema.prisma` is the backend's source of truth for data shapes. `piggy-fe` needs
matching TypeScript types. Options considered: (a) keep hand-written `src/lib/types.ts` in sync
manually, (b) generate types from a vendored OpenAPI contract (`openapi-typescript`) and use those
directly everywhere, (c) generate types and use them only as a drift check against the manual
mirror.

## Decision

Option (c). `src/lib/types.ts` remains hand-written and is the type actually imported and used by
app code (components, hooks). Once Phase 3 tooling lands, a generated
`src/lib/generated/api-types.ts` (from the vendored `contracts/openapi.json`) exists purely as a
reference/drift-check artifact — an ESLint `no-restricted-imports` rule forbids app code from
importing anything under `lib/generated/*`. A drift report (`context/contract-drift.md`) lists
fields present in the OpenAPI schema but missing/mismatched in `types.ts`; this is a WARNING
artifact — a non-empty drift list never fails the build, but the drift report itself must be
committed and fresh (checked by `context:check`).

## Consequences

- Two places to update when a Prisma model changes (`schema.prisma` and `types.ts`) — the drift
  report is a safety net, not a replacement for updating `types.ts` by hand.
- App code never depends on generated types drifting silently changing its compile behavior —
  generated types are inert until a human reads the drift report and updates `types.ts`.
- If this becomes too much manual overhead in practice, revisit switching app code to the generated
  types directly and retire the manual mirror — but that is explicitly not the current decision.
