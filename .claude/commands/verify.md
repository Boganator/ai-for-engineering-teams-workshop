Verify a React component for type correctness, data compatibility, responsive design, and spec compliance.

## Instructions

### Step 1 — Resolve the component

Parse the file path from: $ARGUMENTS

- Strip any leading `@` (e.g., `@components/CustomerCard.tsx` → `src/components/CustomerCard.tsx`)
- If the path starts with `components/`, prepend `src/`
- Derive the component name from the filename (e.g., `CustomerCard.tsx` → `CustomerCard`)
- Read the component file

### Step 2 — TypeScript type check

Run the project's TypeScript compiler:

```
npm run type-check 2>&1
```

- Collect any errors that reference the component file
- Note: this checks the whole project, so filter output to errors in the relevant file path
- Record: ✅ No type errors / ❌ Type errors found (list each with line number and message)

### Step 3 — Lint check

Run ESLint on the specific file:

```
npx eslint src/components/[ComponentName].tsx 2>&1
```

- Record: ✅ No lint errors / ❌ Lint errors found (list each with rule and line)

### Step 4 — Data compatibility check (static analysis)

Read `src/data/mock-customers.ts` and verify the component against it:

**Import check:**
- Does the component import `Customer` or `mockCustomers` from `@/data/mock-customers`?
- Is the import path correct (`@/data/mock-customers`)?

**Type usage check:**
- Does the component use fields that exist on the `Customer` interface?
- Are optional fields (`email`, `subscriptionTier`, `domains`, `createdAt`, `updatedAt`) guarded with null/undefined checks before use?
- Does the component handle the full range of `healthScore` values (0–100)?
- Does the component handle `subscriptionTier` values: `'basic' | 'premium' | 'enterprise'`?

**Mock data coverage:**
Mentally trace the component's rendering logic against these representative mock customers:
- `healthScore: 85` (green range, 2 domains) — John Smith
- `healthScore: 45` (yellow range, 1 domain) — Sarah Johnson
- `healthScore: 15` (red range, 3 domains) — Michael Brown
- `healthScore: 92` (green range, 2 domains) — Emily Davis
- A customer with `domains: undefined` — simulate by omitting the field

For each: would the component render without a runtime error?

Record findings per customer as ✅ Renders correctly / ❌ Would throw / ⚠️ Missing data handling

### Step 5 — Responsive design check (static analysis)

Read the component's JSX and audit Tailwind class usage for responsive coverage:

**Breakpoints to check** (Tailwind v4 defaults):
- Mobile: base classes (no prefix) — 0px and up
- Tablet: `sm:` prefix — 640px and up
- Desktop: `md:` prefix — 768px and up
- Wide: `lg:` prefix — 1024px and up

**Layout checks:**
- Are flex/grid layouts defined for base (mobile) and adapted at larger breakpoints where needed?
- Are text sizes readable at mobile (no fixed widths that would overflow)?
- Are interactive areas (buttons, clickable cards) large enough on touch (`min-h` or `p-` values that give at least 44px touch target)?
- Does the component avoid hardcoded pixel widths that break at small viewports?

**Overflow/truncation:**
- Are long strings (names, company names, domains) handled with `truncate`, `overflow-hidden`, or `break-words`?
- Can the card container shrink gracefully in a narrow column?

Record: ✅ Responsive / ⚠️ Partial (list gaps) / ❌ Not responsive (list issues)

### Step 6 — Accessibility check (static analysis)

- Interactive elements (divs with `onClick`) have `role`, `tabIndex`, and `onKeyDown`
- Images or decorative elements have `aria-hidden="true"`
- Color-only information (e.g., health score color) also has a text label
- No missing `key` props on mapped elements

Record: ✅ Accessible / ⚠️ Partial / ❌ Issues found (list each)

### Step 7 — Spec compliance check

Look for a matching spec file at `specs/[kebab-component-name]-spec.md` (e.g., `CustomerCard` → `specs/customer-card-spec.md`).

If found:
- Read the spec
- Extract all acceptance criteria (`- [ ] ...`)
- For each criterion, evaluate whether the component's code satisfies it
- Mark: ✅ Met / ❌ Not met / ⚠️ Cannot verify statically

If no spec found: skip this step and note it in the report.

### Step 8 — Report results

Output the full verification report in this exact format:

---
## Verification Report: [ComponentName].tsx

### 1. TypeScript
**Status:** ✅ Pass / ❌ Fail
[List any errors, or "No errors found."]

### 2. Lint
**Status:** ✅ Pass / ❌ Fail
[List any errors, or "No errors found."]

### 3. Data Compatibility (`src/data/mock-customers.ts`)
**Status:** ✅ Pass / ⚠️ Warnings / ❌ Fail

| Customer | healthScore | Domains | Renders? |
|----------|-------------|---------|----------|
| John Smith | 85 | 2 | ✅ / ❌ / ⚠️ |
| Sarah Johnson | 45 | 1 | ✅ / ❌ / ⚠️ |
| Michael Brown | 15 | 3 | ✅ / ❌ / ⚠️ |
| Emily Davis | 92 | 2 | ✅ / ❌ / ⚠️ |
| [no domains] | — | 0 | ✅ / ❌ / ⚠️ |

[List any issues.]

### 4. Responsive Design
**Status:** ✅ Pass / ⚠️ Partial / ❌ Fail

| Breakpoint | Status | Notes |
|------------|--------|-------|
| Mobile (base) | ✅ / ⚠️ / ❌ | [note] |
| Tablet (sm:) | ✅ / ⚠️ / ❌ | [note] |
| Desktop (md:) | ✅ / ⚠️ / ❌ | [note] |
| Wide (lg:) | ✅ / ⚠️ / ❌ | [note] |

[List any issues.]

### 5. Accessibility
**Status:** ✅ Pass / ⚠️ Partial / ❌ Fail
[List findings, or "No issues found."]

### 6. Spec Compliance
**Status:** ✅ Pass / ⚠️ Partial / ❌ Fail / ℹ️ No spec found

| # | Criterion | Status |
|---|-----------|--------|
| 1 | [criterion] | ✅ / ❌ / ⚠️ |
| … | … | … |

---
### Overall Result

| Check | Status |
|-------|--------|
| TypeScript | ✅ / ❌ |
| Lint | ✅ / ❌ |
| Data Compatibility | ✅ / ⚠️ / ❌ |
| Responsive Design | ✅ / ⚠️ / ❌ |
| Accessibility | ✅ / ⚠️ / ❌ |
| Spec Compliance | ✅ / ⚠️ / ❌ / ℹ️ |

**Verdict:** ✅ All checks passed / ⚠️ Passed with warnings / ❌ Fails — action required

### Issues Requiring Action
[Numbered list of specific problems that must be fixed, or "None." if all passed.]

### Recommendations
[Optional suggestions for improvement beyond pass/fail criteria.]
---
