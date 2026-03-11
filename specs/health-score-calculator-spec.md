# Feature: Health Score Calculator

## Context
- Core business logic module and companion UI widget for the Customer Intelligence Dashboard
- Provides predictive analytics for customer relationship health and churn risk assessment
- Calculator logic lives in `lib/healthCalculator.ts` as pure functions; UI surface is the `CustomerHealthDisplay` component
- Consumed by `CustomerHealthDisplay`, which integrates with `CustomerSelector` for real-time score updates on customer selection change
- Targeted at business analysts and account managers assessing customer risk

## Requirements

### Functional Requirements

#### Core Algorithm
- Calculate a composite health score on a 0–100 scale from four weighted factors:
  | Factor | Weight |
  |---|---|
  | Payment history | 40% |
  Engagement metrics | 30% |
  | Contract status | 20% |
  | Support satisfaction | 10% |
- Classify the resulting score into a risk level:
  - **Healthy** (71–100): customer in good standing
  - **Warning** (31–70): elevated risk, monitor closely
  - **Critical** (0–30): high churn risk, intervention required
- Each factor is scored independently on a 0–100 sub-scale before weighting

#### Individual Factor Scoring
- **Payment** (`calculatePaymentScore`): inputs — days since last payment, average payment delay (days), overdue amount
- **Engagement** (`calculateEngagementScore`): inputs — login frequency (logins/month), feature usage count, open support ticket count
- **Contract** (`calculateContractScore`): inputs — days until renewal, contract value, whether a recent upgrade occurred
- **Support** (`calculateSupportScore`): inputs — average ticket resolution time (hours), average satisfaction score (1–5), escalation count

#### Main Entry Point
- `calculateHealthScore(data: HealthScoreInput): HealthScoreResult` combines all four factor scores using the defined weights
- Returns overall score, risk level, and individual factor breakdown

#### Validation & Edge Cases
- Validate all numeric inputs are within expected ranges; throw descriptive errors for invalid data
- Handle new customers with missing or zero-value history (default to neutral mid-range scores per factor, documented in JSDoc)
- Handle partially missing data per factor gracefully (document fallback strategy)

### UI Component Requirements (`CustomerHealthDisplay`)
- Display overall health score as a prominent number with color-coded background/badge (red/yellow/green, consistent with `CustomerCard`)
- Display risk level label alongside the score
- Expandable/collapsible section showing individual factor scores and their weights
- Loading state while score is being computed (spinner or skeleton)
- Error state with user-friendly message if calculation throws
- Updates in real time when the selected customer changes in `CustomerSelector`

### Data Requirements

#### Input Interface (`HealthScoreInput`)
```ts
interface PaymentData {
  daysSinceLastPayment: number;
  averagePaymentDelayDays: number;
  overdueAmount: number;
}

interface EngagementData {
  loginsPerMonth: number;
  featureUsageCount: number;
  openSupportTickets: number;
}

interface ContractData {
  daysUntilRenewal: number;
  contractValue: number;
  recentUpgrade: boolean;
}

interface SupportData {
  averageResolutionTimeHours: number;
  averageSatisfactionScore: number; // 1–5
  escalationCount: number;
}

interface HealthScoreInput {
  payment: PaymentData;
  engagement: EngagementData;
  contract: ContractData;
  support: SupportData;
}
```

#### Output Interface (`HealthScoreResult`)
```ts
type RiskLevel = 'healthy' | 'warning' | 'critical';

interface FactorBreakdown {
  payment: number;     // 0–100
  engagement: number;  // 0–100
  contract: number;    // 0–100
  support: number;     // 0–100
}

interface HealthScoreResult {
  score: number;           // 0–100, weighted composite
  riskLevel: RiskLevel;
  breakdown: FactorBreakdown;
}
```

### Integration Requirements
- `CustomerHealthDisplay` receives the selected `Customer` from `CustomerSelector` and computes the health score on selection change
- Color coding (red/yellow/green) must match thresholds used in `CustomerCard` (0–30 / 31–70 / 71–100)
- Loading and error state patterns consistent with other dashboard widgets

## Constraints

### Technical Stack
- Next.js 15, React 19
- TypeScript with strict mode throughout
- Tailwind CSS for `CustomerHealthDisplay` styling (no custom CSS files)
- Pure function architecture for `lib/healthCalculator.ts` — no side effects, no external calls

### File Structure and Naming
- Calculator logic: `lib/healthCalculator.ts`
  - Exported functions: `calculatePaymentScore`, `calculateEngagementScore`, `calculateContractScore`, `calculateSupportScore`, `calculateHealthScore`
  - Exported interfaces: `HealthScoreInput`, `HealthScoreResult`, `FactorBreakdown`, `PaymentData`, `EngagementData`, `ContractData`, `SupportData`
  - Custom error class: `HealthScoreValidationError extends Error`
- UI component: `components/CustomerHealthDisplay.tsx`
  - Exported props interface: `CustomerHealthDisplayProps`
- Tests: `lib/healthCalculator.test.ts`

### Code Quality Constraints
- JSDoc comments on every exported function documenting: purpose, parameter ranges, normalization strategy, edge case behavior, and the mathematical formula used
- Custom `HealthScoreValidationError` class (extends `Error`) for input validation failures, with a descriptive `message` identifying the offending field and expected range
- No magic numbers — all thresholds and weights defined as named constants at the top of `lib/healthCalculator.ts`

### Performance Requirements
- Each `calculateHealthScore` call must complete synchronously in < 1ms for real-time dashboard updates
- Memoize or cache results per customer ID in `CustomerHealthDisplay` to avoid redundant recalculation on re-renders
- No external API calls within the calculator functions

### Security Considerations
- All inputs validated before computation; no user-controlled strings evaluated as code
- Error messages must not expose internal implementation details to the UI layer

## Acceptance Criteria

### Calculator (`lib/healthCalculator.ts`)
- [ ] `calculateHealthScore` returns a score between 0 and 100 (inclusive) for all valid inputs
- [ ] Weighted formula: `score = (payment × 0.4) + (engagement × 0.3) + (contract × 0.2) + (support × 0.1)` verified by unit tests
- [ ] Score 0–30 maps to `riskLevel: 'critical'`, 31–70 to `'warning'`, 71–100 to `'healthy'`
- [ ] Boundary values (30, 31, 70, 71) map to the correct risk level
- [ ] `breakdown` in the result contains the four individual factor scores used in the weighted sum
- [ ] Each individual scoring function returns a value in the 0–100 range for valid inputs
- [ ] `HealthScoreValidationError` is thrown (not a generic Error) for invalid/out-of-range inputs
- [ ] New/missing data scenario returns a score without throwing (documented neutral defaults applied)
- [ ] All exported functions pass TypeScript strict mode checks
- [ ] All constants (weights, thresholds) are named and not inlined as magic numbers
- [ ] Every exported function has a JSDoc comment describing inputs, output range, and formula

### UI Component (`CustomerHealthDisplay`)
- [ ] Displays the overall score prominently with correct color coding (red/yellow/green)
- [ ] Displays the risk level label (`Critical` / `Warning` / `Healthy`)
- [ ] Factor breakdown section is expandable/collapsible and shows all four factor scores
- [ ] Renders a loading state while the score is being computed
- [ ] Renders an error state with a user-friendly message if `calculateHealthScore` throws
- [ ] Score and breakdown update when the selected customer changes
- [ ] Color thresholds match those used in `CustomerCard`
- [ ] `CustomerHealthDisplayProps` TypeScript interface exported from component file
- [ ] No console errors or warnings during render or interaction

### Tests (`lib/healthCalculator.test.ts`)
- [ ] Unit tests for all four individual scoring functions
- [ ] Unit test for `calculateHealthScore` verifying weighted combination
- [ ] Tests covering all three risk level ranges including boundary values
- [ ] Tests for input validation: each invalid field triggers `HealthScoreValidationError`
- [ ] Tests using realistic customer data scenarios (healthy, warning, critical)
- [ ] Tests verifying new-customer/missing-data defaults do not throw
