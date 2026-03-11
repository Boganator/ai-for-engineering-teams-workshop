# Feature: Button Component

## Context
- Reusable button component for the Customer Intelligence Dashboard
- Used throughout the dashboard for primary actions (form submissions, navigation, destructive actions)
- Part of the design system to ensure visual and behavioral consistency across all dashboard views
- Consumed by business analysts and internal users interacting with the dashboard UI

## Requirements

### Functional Requirements
- Accept `label` prop for button text content
- Accept `onClick` prop as click event handler
- Accept `variant` prop to control visual style: `primary`, `secondary`, `danger`
- Support a `loading` state that disables the button and renders an inline spinner
- Support a `disabled` prop to prevent interaction independently of loading state
- Support an optional `ariaLabel` prop for accessible labeling when button text alone is insufficient

### User Interface Requirements
- Variant styles:
  - `primary`: solid blue background, white text — default call-to-action
  - `secondary`: outlined/ghost style, muted text — secondary actions
  - `danger`: solid red background, white text — destructive or irreversible actions
- Loading state: replaces or accompanies label with an animated spinner; button is non-interactive
- Disabled state: reduced opacity, `not-allowed` cursor
- Hover and focus states for all variants
- Focus ring for keyboard navigation accessibility

### Accessibility Requirements
- Renders as a native `<button>` element
- `aria-label` applied from `ariaLabel` prop when provided
- `aria-disabled` reflects disabled/loading state
- `aria-busy` set to `true` during loading state
- Loading spinner hidden from screen readers via `aria-hidden`

### Integration Requirements
- Standalone, stateless component — all state managed by parent
- Composable within forms, modals, toolbars, and action panels
- Properly typed TypeScript interface exported from component file

## Constraints

### Technical Stack
- React 19
- TypeScript with strict mode
- Tailwind CSS for styling (no custom CSS files)

### Design Constraints
- Maximum button width: 200px
- Consistent padding using Tailwind spacing scale (`px-4 py-2` or equivalent)
- Spinner size: 16px, inline with or replacing label text during loading
- Typography: `text-sm font-medium` or equivalent from design system scale

### File Structure and Naming
- Component file: `components/Button.tsx`
- Props interface: `ButtonProps` exported from component file
- Follow project naming conventions (PascalCase for components)

### Security Considerations
- Label rendered as text content only — no HTML injection via props
- `onClick` handler not invoked when `disabled` or `loading` is true

## Acceptance Criteria

- [ ] Renders correctly for all three variants: `primary`, `secondary`, `danger`
- [ ] `onClick` is called when the button is clicked in an enabled, non-loading state
- [ ] `onClick` is NOT called when `disabled` or `loading` is `true`
- [ ] Loading state renders a visible spinner and prevents interaction
- [ ] `disabled` prop renders the button in a visually disabled state with `not-allowed` cursor
- [ ] `ariaLabel` prop sets `aria-label` on the button element
- [ ] `aria-busy="true"` is present during loading state
- [ ] `aria-disabled` reflects disabled and loading states
- [ ] Maximum width of 200px enforced via Tailwind (`max-w-[200px]` or equivalent)
- [ ] `ButtonProps` TypeScript interface is exported from `components/Button.tsx`
- [ ] Passes TypeScript strict mode checks
- [ ] No console errors or warnings
- [ ] Keyboard focusable with visible focus ring
- [ ] Follows project code style and conventions
