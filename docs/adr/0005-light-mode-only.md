# 0005. Light-mode-only design tokens, no dark mode

- **Status**: Accepted
- **Date**: 2026-07-24 (retro-documented 2026-07-28)

## Context

Adding dark mode support (a second token palette, theme toggle, persisted preference, testing both
palettes) is a real, ongoing maintenance cost. The design refresh that introduced `PageHeader.tsx` /
`MobileTabBar.tsx` needed a decision on scope.

## Decision

The app uses a single, light-mode-only design token system (`--tr-*` custom properties in
`globals.css`). No dark mode, no theme toggle, no rebrand beyond the token refresh. This is a
deliberate scope limit, not an oversight — do not add a dark-mode toggle or a second token palette
without revisiting this ADR first.

## Consequences

- Components should reference `--tr-*` tokens rather than hardcoding colors, so a future dark-mode
  pass (if ever undertaken) has a single place to redefine values — but no such pass is currently
  planned.
- No `prefers-color-scheme` handling is implemented; the app renders identically regardless of
  OS-level dark mode settings.
