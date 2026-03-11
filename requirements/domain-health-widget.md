# Domain Health Widget Requirements

## Business Context
- Build a domain health widget for the Customer Intelligence Dashboard
- Display the health status of a selected customer's registered domains
- Give CS managers a quick view of whether customer-owned websites are reachable and healthy
- Exercise 5 in the AI for Engineering Teams workshop — demonstrates component composition with the existing Customer data model

## Functional Requirements

### UI Component
- Build a `DomainHealthWidget` component that accepts a `Customer` object
- List all domains from `customer.domains` (the `domains?: string[]` field)
- Show a mock health status for each domain: `online`, `degraded`, or `offline`
- Derive mock status deterministically from the domain string so results are stable across renders
- Display a summary line: e.g. "3/3 domains healthy" or "1/2 domains online"
- Handle the empty/undefined `domains` case gracefully with a friendly message

### Status Indicators
- `online` — green indicator, label "Online"
- `degraded` — amber indicator, label "Degraded"
- `offline` — red indicator, label "Offline"
- Each domain row: status dot + domain name + status label
- Overall widget status badge derived from the worst domain status present

### Dashboard Integration
- Slot into the existing Exercise 5 placeholder in `src/app/page.tsx`
- Accept a `customer: Customer` prop (or `null` when no customer is selected)
- When no customer is selected, show a "Select a customer to view domain health" empty state
- Match the card/widget styling of other dashboard sections (white bg, rounded, shadow, padding)

## Technical Constraints
- Next.js 15, React 19, TypeScript strict mode, Tailwind CSS v4
- Stateless presentational component — no API calls, no `useEffect`, no internal state
- Mock status derived from domain string (e.g. hash or index-based) — no randomness
- Tailwind utility classes only; no inline styles or CSS modules
- Exports: default export `DomainHealthWidget`, named export `DomainHealthWidgetProps`
- File: `src/components/DomainHealthWidget.tsx`

## Security Requirements
- Domain strings rendered as text only — never as links or injected HTML
- No external fetch calls

## Integration Pattern Requirements
- Reuse `HealthIndicator` component (or its color conventions) for status dots
- Follow same card layout patterns as `CustomerCard`
- Match spacing, typography, and color system used across the dashboard
