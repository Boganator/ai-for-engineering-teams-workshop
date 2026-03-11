# Feature: CustomerCard Component

## Context
- Individual customer display card for the Customer Intelligence Dashboard
- Rendered within the `CustomerSelector` container component to list available customers
- Provides at-a-glance identification: name, company, health score, and associated domains
- Used by business analysts and internal users to quickly assess customer health status before selecting a customer for deeper investigation

## Requirements

### Functional Requirements
- Display the customer's full name and company name
- Display a color-coded health score indicator based on score value:
  - Red (0–30): Poor health
  - Yellow (31–70): Moderate health
  - Green (71–100): Good health
- Display the customer's domain(s) for health monitoring context
- When a customer has multiple domains, show a domain count badge (e.g., "+2 more" or "3 domains")
- Accept an `onClick` handler prop for selection interaction

### User Interface Requirements
- Card-based layout with clear visual separation between customers
- Health indicator rendered as a colored badge or dot alongside the numeric score
- Domain list displayed below customer name/company, styled as subtle secondary information
- Responsive layout: single-column on mobile, adapts to grid/list container on desktop

### Data Requirements
- Accepts a `customer` prop of type `Customer` (imported from `src/data/mock-customers.ts`)
- `Customer` interface fields used:
  - `id: string`
  - `name: string`
  - `company: string`
  - `healthScore: number` (0–100)
  - `domains?: string[]`

### Integration Requirements
- Stateless presentational component — all state managed by parent (`CustomerSelector`)
- Consumes the `Customer` type exported from `src/data/mock-customers.ts`
- Composable within list/grid layouts rendered by `CustomerSelector`

## Constraints

### Technical Stack
- Next.js 15, React 19
- TypeScript with strict mode
- Tailwind CSS for all styling (no custom CSS files)

### Performance Requirements
- Renders without layout shift — domain list height must be stable
- No async operations; all data passed via props

### Design Constraints
- Health score color mapping:
  - `healthScore <= 30` → red (`bg-red-500` / `text-red-600` or equivalent)
  - `healthScore <= 70` → yellow (`bg-yellow-400` / `text-yellow-600` or equivalent)
  - `healthScore > 70` → green (`bg-green-500` / `text-green-600` or equivalent)
- Card padding: Tailwind spacing scale (`p-4` or equivalent)
- Typography hierarchy: customer name as primary text, company and domains as secondary/muted
- Domain count display when `domains.length > 1`

### File Structure and Naming
- Component file: `components/CustomerCard.tsx`
- Props interface: `CustomerCardProps` exported from component file
- Follow PascalCase naming for component and interface

### Security Considerations
- All customer data rendered as text content only — no HTML injection via props
- `onClick` should only be invoked on intentional user interaction (click/keyboard)

## Acceptance Criteria

- [ ] Renders customer `name` and `company` visibly on the card
- [ ] Renders `healthScore` with correct color coding (red/yellow/green) for all three ranges
- [ ] Renders each domain in `domains` array when present
- [ ] Displays a domain count indicator when `domains.length > 1`
- [ ] Renders without errors when `domains` is `undefined` or empty
- [ ] `onClick` prop is called when the card is clicked
- [ ] `CustomerCardProps` TypeScript interface is exported from `components/CustomerCard.tsx`
- [ ] Accepts `Customer` type from `src/data/mock-customers.ts` without type errors
- [ ] Passes TypeScript strict mode checks
- [ ] Responsive layout renders correctly on mobile and desktop viewports
- [ ] No console errors or warnings during render
- [ ] Health score boundary values (0, 30, 31, 70, 71, 100) map to the correct colors
