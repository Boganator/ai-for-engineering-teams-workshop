# Spec: CustomerHealthMonitoring

## Feature: CustomerHealthMonitoring

### Context
- Combines health score calculation with predictive alert generation into a unified monitoring system for the Customer Intelligence Dashboard
- Serves customer success managers who need real-time visibility into customer health and proactive risk signals
- Integrates `lib/healthCalculator.ts` (pure scoring functions) with `lib/alerts.ts` (rule-based alert engine) and a `CustomerHealthDisplay` UI widget
- Sits alongside CustomerSelector, MarketIntelligenceWidget, and other dashboard widgets; updates in real-time when the selected customer changes

### Requirements

**Functional**
- Calculate a 0–100 health score from four weighted factors: Payment (40%), Engagement (30%), Contract (20%), Support (10%)
- Classify scores into risk levels: Healthy (71–100), Warning (31–70), Critical (0–30)
- Evaluate alert rules against current customer data and emit prioritized alerts:
  - High: Payment overdue >30 days OR health score drops >20 pts in 7 days
  - High: Login frequency drops >50% vs. 30-day average (Engagement Cliff)
  - High: Contract expires <90 days AND health score <50
  - Medium: >3 support tickets in 7 days OR escalated ticket (Support Spike)
  - Medium: No new feature usage in 30 days for growing accounts (Feature Stall)
- Deduplicate alerts per customer/issue; enforce cooldown periods to prevent alert fatigue
- Display overall score with color-coded indicator and an expandable breakdown of individual factor scores
- Show active alerts sorted by priority with recommended actions
- Support loading and error states consistent with other dashboard widgets

**Data inputs**
- Payment: `daysSinceLastPayment`, `avgPaymentDelayDays`, `overdueAmountUsd`
- Engagement: `loginFrequencyPerWeek`, `featureUsageCount`, `openSupportTickets`
- Contract: `daysUntilRenewal`, `contractValueUsd`, `recentUpgrades`
- Support: `avgResolutionTimeDays`, `satisfactionScore` (0–10), `escalationCount`
- Historical snapshots for trend/drop detection (health score series, login history)

**UI**
- `CustomerHealthDisplay` widget: overall score ring/badge, risk level label, factor breakdown list (collapsible), active alerts panel
- Alert items show: priority badge (red/yellow), alert type, trigger summary, recommended action, dismiss button
- Integrates with CustomerSelector — re-evaluates score and alerts on customer change

### Constraints

- **Stack**: Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS
- **Architecture**: Pure functions only in `lib/healthCalculator.ts` and `lib/alerts.ts`; no side effects, no external calls
- **Interfaces** (TypeScript, all required):
  ```ts
  interface PaymentData { daysSinceLastPayment: number; avgPaymentDelayDays: number; overdueAmountUsd: number; }
  interface EngagementData { loginFrequencyPerWeek: number; featureUsageCount: number; openSupportTickets: number; }
  interface ContractData { daysUntilRenewal: number; contractValueUsd: number; recentUpgrades: number; }
  interface SupportData { avgResolutionTimeDays: number; satisfactionScore: number; escalationCount: number; }
  interface CustomerHealthInput { payment: PaymentData; engagement: EngagementData; contract: ContractData; support: SupportData; history?: HealthHistory; }
  interface HealthScoreResult { score: number; riskLevel: 'healthy' | 'warning' | 'critical'; breakdown: FactorScores; }
  interface Alert { id: string; customerId: string; priority: 'high' | 'medium'; type: string; message: string; recommendedAction: string; triggeredAt: Date; }
  ```
- **Scoring weights**: exactly Payment 40%, Engagement 30%, Contract 20%, Support 10%
- **Validation**: throw typed `HealthCalculationError` / `AlertEngineError` (extend `Error`) on invalid inputs with descriptive messages
- **JSDoc**: every public function documents formula, assumptions, and edge-case behavior
- **Rendering**: widget max width 480px; color tokens: green (`#22c55e`), yellow (`#eab308`), red (`#ef4444`) matching dashboard system
- **Performance**: score + alert evaluation completes synchronously in <10 ms per customer; memoize at component level with `useMemo`
- **File locations**: `lib/healthCalculator.ts`, `lib/alerts.ts`, `components/CustomerHealthDisplay.tsx`

### Acceptance Criteria

- [ ] `calculateHealthScore` returns correct weighted score for all valid input combinations
- [ ] Risk levels assigned correctly at boundary values (30, 31, 70, 71)
- [ ] All five alert rule types trigger at their defined thresholds and not below
- [ ] Duplicate alerts for same customer/issue are suppressed; cooldown respected
- [ ] Invalid inputs throw `HealthCalculationError` or `AlertEngineError` with descriptive messages
- [ ] New customer edge case (no history) handled gracefully without errors
- [ ] Missing optional fields (`history`) use sensible defaults and are documented
- [ ] `CustomerHealthDisplay` renders loading skeleton while data is fetching
- [ ] `CustomerHealthDisplay` renders error state with retry option on failure
- [ ] Widget re-evaluates score and alerts when CustomerSelector changes selection
- [ ] Factor breakdown is collapsible and accessible via keyboard
- [ ] Alert panel lists items in priority order (high before medium)
- [ ] Dismiss action removes alert from active list (local state)
- [ ] Color coding matches dashboard system tokens (green/yellow/red)
- [ ] Unit tests cover: all factor scoring functions, boundary conditions, error handling, all five alert rules, deduplication logic
- [ ] Mathematical accuracy verified: weighted sum = 100% across all test cases
