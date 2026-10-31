# 0009. Responsive application design and light/dark/system appearance

- **Status**: Accepted
- **Date**: 2026-10-30
- **Supersedes**: [ADR 0005](0005-light-mode-only.md)

## Context

The portfolio UI used oversized, fixed-height cards and desktop-oriented forms that stacked into
long mobile dialogs. Actions scrolled away, while read-only reference values occupied
editable-looking controls. The initial dashboard and Add/Close Position pilot established refined
neutral surfaces and a blue accent. Its approved patterns now extend across the application.

## Decision

- Retain PrimeReact v10. Own semantic tokens, density, typography and responsive layout instead of
  rebuilding accessible controls from scratch.
- Support Light, Dark and System, defaulting to System. Persist the non-sensitive preference when
  storage is available and retain it in memory otherwise. Place the appearance selector in Account
  Settings > Profile Details, not in navigation or authentication screens. Changes apply immediately
  on the current device independently of Save Profile; existing saved preferences remain respected.
- Apply the palette before first paint, then let `ThemeProvider` handle changes, OS preferences and
  cross-tab updates. Theme failures are logged.
- Generate same-origin Lara theme styles from the installed package through `yarn theme:build` (also
  run automatically by `predev` and `prebuild`). Do not edit or commit generated `public/themes/`
  assets. The existing Geist font is reused.
- Use natural page scrolling for holdings, compact metric cards and a shorter, theme-aware chart.
  Retain account-first/exchange-scoped behaviour and privacy masking. Confine horizontal scrolling
  to the holdings table, not the card header, so action focus rings remain visible.
- Share page headers, compact cards, responsive filter grids and locally contained tables across
  History, Statistics, Reports, Screener, Imports and Account Settings. On mobile, History defaults
  to symbol, disposal date and P/L; an explicit All columns toggle retains access to the full table.
  History and report details paginate without fixed-height vertical table scroll areas. Totals
  continue to describe the whole scoped History group, not only the visible page.
- Use compact branding on authentication pages, with the global theme still applied. Offline states
  and destructive confirmations use semantic surfaces in both themes.
- Use full-height right-side desktop drawers and full-screen mobile task dialogs for Add/Edit/Close
  Position, editing closed positions, report generation/detail, import upload, adding to watchlists
  and Statistics trade details. Retain centered dialogs for short forms and confirmations, including
  account deletion. Complex import review remains a dedicated page with persistent actions. Use
  PrimeReact's right-position slide transition, respecting reduced-motion preferences. Keep the
  header and footer outside the single scrolling content region; size to the visual viewport when
  the keyboard opens. Do not automatically focus a mobile field on opening.
- Investment type, purchase currency, Screener view and search mode use shared-container segmented
  controls with 4px internal spacing, an inset selected state and visible keyboard focus.
- Display reference values as summaries, and progressively disclose optional fields without clearing
  their state. Failed validation reveals/focuses the invalid field.
- Closed-position editing uses grids sized to the drawer's available width, not desktop viewport
  breakpoints. Long crypto amounts wrap within their own cells; date and price controls retain
  enough room without shrinking editable precision.
- All editable position comments start at three lines, auto-grow up to 200px, then scroll
  internally. Buy and Sell Comments stack at full width in closed-position editing. The cap affects
  presentation only, never comment content or submission.
- Show desktop primary navigation at 1024px and above to avoid crowding. Keep the existing
  destinations in the bottom bar below that breakpoint.

## Consequences

Both themes require testing. Existing colour utility names resolve through the semantic palette in
both modes, including warning and destructive states. Dashboard and Statistics share a chart palette
that changes with appearance; exported print documents remain light and print-friendly. Navigation
destinations are unchanged. Complex PrimeReact controls can be replaced selectively if testing
exposes a concrete limitation.

No API contracts, parcel rules, calculations, report account scoping or offline mutation behaviour
change. Verify responsive layouts at 320, 390, 430, 768 and desktop widths, including short
viewports, keyboard resizing, dropdowns, error focus and long names.
