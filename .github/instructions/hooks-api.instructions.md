---
applyTo: 'src/hooks/**,src/lib/api/**'
---

# Hooks / API client conventions

- HTTP layer lives in `src/lib/api/*` (split by domain: `http.ts` shared axios instance +
  interceptors, `mappers.ts`, `auth.ts`, `accounts.ts`, `user.ts`, `portfolio.ts`, `positions.ts`,
  `stocks.ts`, `tax-reports.ts`), re-exported as the `apiClient` facade from `src/lib/api-client.ts`
  (~26 lines) so existing call sites/imports don't break.
- React Query hooks in `src/hooks/api.ts` are the ONLY thing components call — never import
  `src/lib/api/*` directly from `src/app/**` pages or `src/components/**`.
- Never hardcode API URLs. Use `NEXT_PUBLIC_API_URL` (default `http://localhost:4000/api`).
- Data shapes: camelCase JSON keys both sides, no transform layer. `src/lib/types.ts` is the
  manually mirrored source of truth for app code (ADR 0007) — update it whenever
  `piggy-api/prisma/schema.prisma` changes a relevant model.
- Auth: access token in `localStorage` under `authToken`, attached via a request interceptor in
  `http.ts`. Refresh token is an `httpOnly`/`Secure`/`SameSite=Strict` cookie set by the backend. On
  `401`, attempt exactly one `POST /api/auth/refresh`; if that fails, clear auth state and redirect
  to `/auth/login`.
- Error shape from the backend:
  ```json
  { "error": "Unauthorized", "message": "Invalid or expired token" }
  ```
  Validation errors use `{ "error": "Validation Error", "details": [...] }`. Match on these keys in
  shared error-handling code rather than parsing free-text messages.
- Query keys and invalidations: keep them centralized in `src/hooks/api.ts` so mutations invalidate
  the right queries — don't duplicate query-key strings across hook call sites.

## Test gotcha (vi.hoisted)

When mocking `@/hooks/api` or `next/navigation` in a component test, do NOT return a fresh
object/array literal on every call (e.g. `useRouter: () => ({ replace: vi.fn() })` or `data: []`) if
the real component lists that value in an effect's deps array — a new reference every render can
loop the effect indefinitely and OOM-crash vitest. Hoist a stable mock via
`vi.hoisted(() => ({...}))` and return the same reference every call.
