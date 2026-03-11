# Feature: CustomerSelector Component

## Context
- Main customer selection interface for the Customer Intelligence Dashboard
- Renders a searchable, scrollable list of `CustomerCard` components
- Used by business analysts and internal users to quickly find and select a customer for deeper investigation
- Manages selection state and persists the selected customer across page interactions within the session

## Requirements

### Functional Requirements
- Render a list of customer cards using the `CustomerCard` component
- Provide a search input to filter customers by name or company (case-insensitive, substring match)
- Highlight the currently selected customer card with a distinct visual selection state
- Persist the selected customer in local component state across search/filter interactions (selection is not cleared when the search query changes)
- Emit the selected `Customer` object to the parent via an `onSelect` callback prop
- Handle lists of 100+ customers without degraded UI responsiveness

### User Interface Requirements
- Search input rendered at the top of the component, above the customer list
- Customer list rendered in a scrollable container with a fixed max-height
- Selected card visually distinguished (e.g., highlighted border or background) from unselected cards
- Empty state message displayed when no customers match the current search query
- Loading state supported if data fetching is introduced in future iterations (optional prop)

### Data Requirements
- Accepts a `customers` prop of type `Customer[]` (from `src/data/mock-customers.ts`)
- Maintains internal state for:
  - `searchQuery: string` — current filter input value
  - `selectedCustomerId: string | null` — ID of the currently selected customer
- Filtering is derived/computed from `customers` + `searchQuery` (no separate filtered state)

### Integration Requirements
- Composes `CustomerCard` for each filtered customer
- Passes selection state down to `CustomerCard` via an `isSelected` prop
- Calls `onSelect(customer: Customer)` when a card is clicked
- Properly typed TypeScript interface exported from component file

## Constraints

### Technical Stack
- Next.js 15, React 19
- TypeScript with strict mode
- Tailwind CSS for all styling (no custom CSS files)

### Performance Requirements
- Filter computation must be synchronous and derived — no debounce required for lists up to 100 customers
- Scrollable list uses CSS overflow (`overflow-y-auto`) with a fixed max-height to avoid layout reflow
- Avoid unnecessary re-renders: filtered list recalculated only when `customers` or `searchQuery` changes

### Design Constraints
- Search input: full-width, standard Tailwind form styling (`border rounded px-3 py-2` or equivalent)
- Scrollable list max-height: `max-h-96` or equivalent (approx. 384px)
- Selected card: distinct highlight, e.g., `ring-2 ring-blue-500` or `border-blue-500`
- Empty state: centered muted text (e.g., "No customers found")
- Typography and spacing consistent with `CustomerCard` design

### File Structure and Naming
- Component file: `components/CustomerSelector.tsx`
- Props interface: `CustomerSelectorProps` exported from component file
- Follow PascalCase naming for component and interface

### Security Considerations
- Search query rendered as a controlled input value only — no injection risk
- Customer data passed through to `CustomerCard` as props; no direct DOM manipulation

## Acceptance Criteria

- [ ] Renders a `CustomerCard` for each customer in the `customers` prop
- [ ] Search input filters the customer list by name or company (case-insensitive substring match)
- [ ] Filtered list updates immediately as the user types in the search input
- [ ] Selected customer card is visually distinguished from unselected cards
- [ ] Clicking a card calls `onSelect` with the corresponding `Customer` object
- [ ] Selected customer remains highlighted when the search query changes (selection persists)
- [ ] Clearing the search restores the full customer list with selection state intact
- [ ] Empty state message is shown when no customers match the search query
- [ ] Handles `customers` prop with 100+ entries without UI lag
- [ ] `CustomerSelectorProps` TypeScript interface is exported from `components/CustomerSelector.tsx`
- [ ] Passes TypeScript strict mode checks
- [ ] No console errors or warnings during render or interaction
- [ ] Scrollable list does not cause page-level scroll when the list overflows
