# Spec Template for Workshop

## Feature: DomainHealthWidget

### Context
- **Purpose:** A dashboard widget that displays the health status of all domains registered to a selected customer, giving CS managers a quick at-a-glance view of whether customer-owned websites are reachable.
- **Role in the system:** Slot into the Exercise 5 placeholder in `src/app/page.tsx` as part of the Dashboard Widgets grid. Consumes the `Customer` interface's `domains` field and composes with existing color conventions from `HealthIndicator`. It is a leaf presentational component — no API calls, no side effects.
- **Users:** CS managers and account executives using the Customer Intelligence Dashboard to identify customers with infrastructure problems.

### Requirements

**Functional requirements:**
- Accept a `customer: Customer | null` prop; when `null`, render an empty state prompting the user to select a customer.
- List all domains from `customer.domains` (`string[] | undefined`).
- Derive a deterministic mock status (`'online' | 'degraded' | 'offline'`) for each domain from the domain string itself (e.g. character-code sum modulo 3) — no randomness, stable across re-renders.
- Display a per-domain row: status dot + domain name + status label.
- Display a summary line: e.g. "3/3 domains online" or "2/3 domains online".
- Derive an overall widget status badge from the worst status present across all domains (offline > degraded > online).
- When `customer.domains` is `undefined` or empty, render a friendly "No domains registered" message instead of a list.

**User interface requirements:**
- Widget card: white background, rounded corners, shadow, consistent padding — matching other dashboard sections.
- Status colours: green for `online`, amber for `degraded`, red for `offline`.
- Each status indicator must include both a colored dot (`aria-hidden`) and a text label — color is never the sole differentiator.
- Domain names rendered as plain text (never as links or raw HTML).
- Overall status badge displayed in the widget header alongside the widget title.

**Data requirements:**
- Imports `Customer` from `@/data/mock-customers`.
- Does not import `mockCustomers` directly — receives a single `Customer | null` via props.
- Only accesses `customer.name`, `customer.company`, and `customer.domains`.
- `domains` is optional; component must not throw when it is `undefined`.

**Integration requirements:**
- Exported as default export `DomainHealthWidget` and named export `DomainHealthWidgetProps` from `src/components/DomainHealthWidget.tsx`.
- Can replace the `DashboardWidgetDemo` stub for Exercise 5 in `src/app/page.tsx`.
- May reuse `HealthIndicator` color conventions (dot + label pattern) for per-domain status rows.

### Constraints

- **Tech stack:** Next.js 15, React 19, TypeScript (strict mode), Tailwind CSS v4.
- **Styling:** Tailwind utility classes only — no CSS modules, no inline style objects.
- **Props interface:**
  ```ts
  export interface DomainHealthWidgetProps {
    customer: Customer | null;
  }
  ```
- **Stateless:** No `useState`, no `useEffect`, no data fetching — pure render from props.
- **No interactive elements:** Display-only; no `onClick`, no `role="button"`.
- **Mock status derivation:** Must be deterministic and pure — same domain string always yields the same status. Acceptable approach: `['online', 'degraded', 'offline'][charCodeSum(domain) % 3]`.
- **File:** `src/components/DomainHealthWidget.tsx`.
- **Performance:** Synchronous render only; no async operations.
- **Security:** Domain strings rendered as text content only — never as `href`, `dangerouslySetInnerHTML`, or injected HTML.
- **Responsive:** Base Tailwind classes defined for mobile; widget must fit in a single column on small screens and in the `lg:grid-cols-3` dashboard grid on wide screens.

### Acceptance Criteria

- [ ] File exists at `src/components/DomainHealthWidget.tsx` and exports `DomainHealthWidget` (default) and `DomainHealthWidgetProps` (named).
- [ ] Accepts `customer: Customer | null` prop.
- [ ] When `customer` is `null`, renders an empty state with "Select a customer to view domain health" (or equivalent message).
- [ ] When `customer.domains` is `undefined` or empty, renders a "No domains registered" message.
- [ ] Renders a row for each domain in `customer.domains` showing: status dot, domain name, status label.
- [ ] Status dot is `aria-hidden="true"`; status label text is always visible alongside the dot.
- [ ] Status colours: `online` → green, `degraded` → amber, `offline` → red.
- [ ] Mock status is derived deterministically — the same domain string always produces the same status across renders.
- [ ] Displays a summary line (e.g. "3/3 domains online").
- [ ] Displays an overall status badge in the widget header derived from the worst domain status.
- [ ] Domain strings are rendered as plain text — not as anchor tags or injected HTML.
- [ ] No TypeScript errors (`npm run type-check` passes with this component in scope).
- [ ] No ESLint errors (`npx eslint src/components/DomainHealthWidget.tsx` passes).
- [ ] Renders correctly for customers with 1 domain, 2 domains, and 3 domains.
- [ ] Renders correctly for a customer with `domains: undefined`.
- [ ] Mobile-safe: base Tailwind layout classes defined; no fixed widths that overflow narrow columns.
