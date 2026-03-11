Implement a React component from a spec file, then verify and refine until all acceptance criteria are met.

## Instructions

### Step 1 — Read the spec

Read the spec file provided in: $ARGUMENTS

- Strip any leading `@` from the path before reading (e.g., `@specs/customer-card-spec.md` → `specs/customer-card-spec.md`)
- Extract the component name from the `## Feature:` heading (e.g., "CustomerCard Component" → `CustomerCard`)
- Extract all acceptance criteria checkboxes (`- [ ] ...`) into a checklist you will verify against

### Step 2 — Gather context

Before writing any code, read the following to understand conventions:

- `src/data/mock-customers.ts` — check for relevant types/interfaces used by this component
- Any existing component files in `src/components/` that are referenced in the spec's Integration Requirements
- If the spec references other local files, read those too

### Step 3 — Generate the component

Create the component at: `src/components/[ComponentName].tsx`

Follow these conventions derived from the spec's Constraints section:

- Use TypeScript with strict types; export the Props interface as `[ComponentName]Props`
- Use Tailwind CSS exclusively for styling — no inline style objects, no CSS modules
- Write a default export for the component function
- Keep the component stateless/presentational unless the spec explicitly requires local state
- Handle all edge cases called out in the spec (undefined/empty props, boundary values, etc.)
- Add keyboard accessibility (`onKeyDown`, `role`, `tabIndex`) where the spec requires click interaction

### Step 4 — Verify against acceptance criteria

Go through each acceptance criterion extracted in Step 1 and evaluate whether the generated code satisfies it:

For each criterion, mark it as one of:
- ✅ Met — explain briefly why
- ❌ Not met — explain the gap

### Step 5 — Refine if needed

If any criteria are marked ❌:

1. Identify the root cause for each failing criterion
2. Update the component file to address all gaps
3. Re-verify the updated code against the full checklist
4. Repeat until every criterion is ✅

Do not stop until all acceptance criteria pass.

### Step 6 — Report

Output a final summary in this format:

---
## Implementation: [ComponentName]

**File saved to:** `src/components/[ComponentName].tsx`

### Acceptance Criteria Verification

| # | Criterion | Status |
|---|-----------|--------|
| 1 | [criterion text] | ✅ Met / ❌ Not met |
| … | … | … |

### Iterations
[Number of refinement passes required, or "None — all criteria met on first pass."]

### Notes
[Any assumptions made, trade-offs, or deviations from the spec with justification]
---
