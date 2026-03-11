# Spec Template for Workshop

## Feature: HealthIndicator

### Context
- **Purpose:** A reusable visual indicator that communicates a customer's health score at a glance using color-coded status, a numeric score, and a label.
- **Role in the system:** Used inside `CustomerCard` and any other component that needs to surface a `Customer`'s `healthScore`. It is a pure presentational leaf component — it receives a score and renders the appropriate visual treatment without any logic of its own.
- **Users:** Internal dashboard users (CS managers, account executives) scanning the Customer Intelligence Dashboard to quickly identify at-risk customers.

### Requirements

**Functional requirements:**
- Accept a `healthScore: number` (0–100) and derive a status tier: `critical` (0–39), `warning` (40–69), `healthy` (70–100).
- Render a color-coded badge or pill reflecting the tier: red for critical, yellow/amber for warning, green for healthy.
- Display the numeric score alongside a human-readable label (`Critical`, `At Risk`, `Healthy`).
- Optionally accept a `size` prop (`'sm' | 'md' | 'lg'`) to support use in compact cards as well as detail views; default to `'md'`.

**User interface requirements:**
- Badge/pill layout: colored dot or icon + numeric score + label text, all on a single line.
- The color must not be the only differentiator — the label text must also convey the status (accessibility).
- Component must be compact enough to sit inline within a `CustomerCard`.

**Data requirements:**
- Consumes `healthScore: number` from the `Customer` interface (`src/data/mock-customers.ts`).
- Does **not** import `Customer` directly — accepts `healthScore` as a plain prop to stay reusable.

**Integration requirements:**
- Exported as a named component from `src/components/HealthIndicator.tsx`.
- `HealthIndicatorProps` interface exported from the same file.
- Can be dropped into `CustomerCard` to replace any inline health-score rendering.

### Constraints

- **Tech stack:** Next.js 15, React 19, TypeScript (strict mode), Tailwind CSS v4.
- **Styling:** Tailwind utility classes only — no CSS modules, no inline style objects.
- **Props interface:**
  ```ts
  export interface HealthIndicatorProps {
    healthScore: number;     // 0–100
    size?: 'sm' | 'md' | 'lg'; // default: 'md'
  }
  ```
- **Stateless:** No internal state; all data comes from props.
- **No interactive elements:** Component is display-only — no `onClick`, no `role="button"`.
- **File:** `src/components/HealthIndicator.tsx` (PascalCase filename, `.tsx` extension).
- **Performance:** Synchronous render only; no async data fetching, no `useEffect`.
- **Security:** No user-supplied strings rendered as HTML; all values are numbers or derived constants.

### Acceptance Criteria

- [ ] Component file exists at `src/components/HealthIndicator.tsx` and exports both `HealthIndicator` (default or named) and `HealthIndicatorProps`.
- [ ] Accepts `healthScore: number` prop and an optional `size?: 'sm' | 'md' | 'lg'` prop.
- [ ] `healthScore` 0–39 renders with red styling and the label `Critical`.
- [ ] `healthScore` 40–69 renders with amber/yellow styling and the label `At Risk`.
- [ ] `healthScore` 70–100 renders with green styling and the label `Healthy`.
- [ ] The numeric score is visible in the rendered output alongside the label.
- [ ] Color is never the sole indicator of status — label text is always present.
- [ ] Size variants (`sm`, `md`, `lg`) change text and/or padding classes proportionally.
- [ ] No TypeScript errors (`npm run type-check` passes with this component in scope).
- [ ] No ESLint errors (`npx eslint src/components/HealthIndicator.tsx` passes).
- [ ] Renders correctly for all representative mock `healthScore` values: 15, 35, 45, 60, 73, 85, 88, 92.
- [ ] Renders without runtime error when `size` prop is omitted (uses default `'md'`).
- [ ] Component is usable inside `CustomerCard` without layout breakage on mobile (base Tailwind classes defined).
