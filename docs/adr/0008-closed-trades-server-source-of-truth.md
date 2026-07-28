# 0008. Server (`useClosedPositions`) is the source of truth for closed trades

- **Status**: Accepted
- **Date**: 2026-07-27 (Phase 0 item 0f)

## Context

Closed trades were readable from two places: the server (`GET /positions/close-events`, via
`useClosedPositions()`) and a `localStorage`-backed `src/lib/closed-trades-store.ts`. Having two
sources risked the History page showing stale localStorage data that disagreed with the server (e.g.
after editing a close event's comment or on a different device).

## Decision

The server is the sole source of truth. A full-repo grep confirmed `closed-trades-store.ts`'s
localStorage read/write functions had **zero call sites** anywhere in the app beyond its own type —
it was dead code. The file was deleted entirely; its `ClosedTrade` interface was moved into
`src/lib/types.ts`, and the 6 import sites across the app were updated to import it from there
instead.

## Consequences

- History page and any future "closed trades" UI must fetch from `GET /positions/close-events` (via
  `useClosedPositions()`), never from `localStorage`.
- No client-side caching layer for closed trades beyond React Query's own cache — this is
  intentional; do not reintroduce a parallel localStorage store for this data.
