---
applyTo: 'src/app/**,public/**,next.config.ts'
---

# PWA / offline conventions

- Service worker via `@ducanh2912/next-pwa`; runtime caching config lives in `next.config.ts` /
  `public/sw.js` (generated).
- **Never cache authenticated `/api` responses** in the service worker's runtime caching — doing so
  risks serving one user's data to the next user on a shared/reused device.
- Clear client-side caches (React Query cache + any local UI cache) on sign-out, so no stale
  cross-user data survives a logout/login cycle on the same browser.
- Read-only views (portfolio dashboard, history) should show the last-successful cached data plus an
  explicit stale-data indicator when the app detects it's offline, rather than a blank/error state.
- Do not queue or auto-retry mutations made while offline — mutations should fail visibly (via
  `useToast()`/`<Message>`), not silently queue for later replay. This is a deliberate scope limit,
  not an oversight.
- Prefer responsive, touch-friendly layouts and lightweight flows that work well on both mobile and
  desktop, consistent with the rest of the PWA.
