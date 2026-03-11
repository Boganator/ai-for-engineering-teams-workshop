# Spec: DashboardOrchestrator

## Feature: DashboardOrchestrator

### Context
- Top-level composition layer that assembles all Customer Intelligence Dashboard widgets into a production-ready, cohesive application
- Used by customer success teams as a business-critical tool; must meet enterprise reliability, accessibility, and security standards
- Wraps CustomerSelector, CustomerHealthDisplay, MarketIntelligenceWidget, PredictiveAlerts, and any future widgets with error boundaries, performance optimizations, and export capabilities
- Transforms the existing prototype dashboard into a deployment-ready Next.js application

### Requirements

**Error Handling & Resilience**
- Three-tier React error boundary system:
  - `DashboardErrorBoundary`: application-level — catches fatal errors, shows full-page fallback with reload option
  - `WidgetErrorBoundary`: per-widget isolation — failed widget shows inline error card without collapsing sibling widgets
  - Component-level boundaries for sub-components with sensitive logic
- Retry mechanism with configurable attempt limit (default 3) and exponential backoff
- User-friendly error messages that never expose stack traces, internal state, or sensitive data in production
- Automatic error reporting (structured log to console in dev; hook for external error tracker in prod)
- Graceful degradation: core customer list remains functional even when all widgets fail

**Data Export**
- Export formats: CSV and JSON
- Exportable datasets: customer list, health score reports (with factor breakdown), alert history, market intelligence summaries
- Configurable filters: date range, customer segment, risk level
- Progress indicator for long-running exports; cancellation support
- File naming: `{dataset}-{YYYY-MM-DD}-{HH-mm}.{ext}`
- Export audit log entry per action (user, dataset, timestamp, filter params)

**Performance**
- `React.memo` on all pure display widgets
- `useMemo` / `useCallback` for expensive derivations and event handlers passed as props
- `React.lazy` + `Suspense` for below-the-fold widgets (MarketIntelligence, AlertHistory)
- Virtual scrolling for customer lists exceeding 50 rows
- No memory leaks: all subscriptions and timers cleaned up on unmount

**Accessibility (WCAG 2.1 AA)**
- Semantic HTML landmarks: `<header>`, `<main>`, `<nav>`, `<aside>`, `<section>` with `aria-label`
- Skip-to-main-content link as first focusable element
- Logical tab order following visual content flow
- All interactive elements have visible focus indicators meeting 3:1 contrast ratio
- Live regions (`aria-live="polite"`) for async updates (health score refresh, new alerts)
- Modal/popover focus trap with Escape to close
- All charts/visualizations have text alternatives
- Full keyboard operability — no mouse-only interactions

**Security Hardening**
- Next.js `headers()` config: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- Input sanitization on all search/filter fields before any rendering or API call
- Export endpoints validate user permissions and apply rate limiting (10 exports/min)
- Error messages and logs strip sensitive fields (PII, tokens, internal paths)
- HTTPS-only enforcement via Next.js redirect config

**Deployment Configuration**
- Health check endpoint at `GET /api/health` returning `{ status, version, uptime, dependencies }`
- Environment-specific config via `.env.local` / `.env.production`; no secrets in client bundle
- Production logging: structured JSON, `warn`+ level, no PII
- `next.config.js` with security headers, image domains allowlist, bundle analysis script

### Constraints

- **Stack**: Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS
- **File locations**:
  - `components/DashboardErrorBoundary.tsx`, `components/WidgetErrorBoundary.tsx`
  - `components/Dashboard.tsx` (orchestrator root)
  - `lib/exportUtils.ts` (format-agnostic export helpers)
  - `app/api/health/route.ts`
  - `next.config.js` (security headers, CSP)
- **Error classes**: `DashboardError`, `WidgetError`, `ExportError` — all extend `Error` with `code: string` and `context: Record<string, unknown>`
- **Performance targets** (measured on mid-range broadband):
  - FCP < 1.5s, LCP < 2.5s, CLS < 0.1, TTI < 3.5s, smooth 60fps interactions
- **Bundle**: no widget should block initial paint; lazy load everything below the fold
- **Accessibility**: axe-core must report zero critical/serious violations
- **Export**: CSV uses RFC 4180; JSON is pretty-printed with 2-space indent; max streaming chunk 1 MB
- **Rate limiting**: client-side debounce + server-side header `X-RateLimit-Remaining`
- **No backwards-compat shims**: remove dead code rather than alias it

### Acceptance Criteria

- [ ] A single widget crash does not crash sibling widgets or the customer list
- [ ] `DashboardErrorBoundary` shows user-friendly fallback with reload CTA on fatal error
- [ ] `WidgetErrorBoundary` shows inline error card with retry button; retries up to 3 times
- [ ] Error messages in production contain no stack traces, internal paths, or PII
- [ ] CSV export downloads a valid RFC 4180 file with correct headers and data rows
- [ ] JSON export downloads valid, pretty-printed JSON matching schema
- [ ] Export progress indicator visible for operations >500ms; cancel stops the export
- [ ] Export audit log entry created for each export action
- [ ] All widgets pass axe-core with zero critical/serious accessibility violations
- [ ] Tab order is logical; all interactive elements reachable and operable by keyboard alone
- [ ] Skip-to-main link is the first focusable element and works correctly
- [ ] `aria-live` regions announce health score updates and new alerts to screen readers
- [ ] Response headers include CSP, X-Frame-Options, X-Content-Type-Options on all routes
- [ ] `GET /api/health` returns 200 with valid JSON status payload
- [ ] Initial page LCP < 2.5s measured with Lighthouse on production build
- [ ] No memory leaks detected after mounting/unmounting Dashboard 10 times in test
- [ ] Customer list renders 200 rows without frame drops using virtual scrolling
- [ ] `React.lazy` chunks for deferred widgets visible in bundle analysis output
- [ ] All sensitive env vars absent from client-side bundle (`NEXT_PUBLIC_` prefix enforced)
