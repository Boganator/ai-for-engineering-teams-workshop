# Spec: PredictiveIntelligence

## Feature: PredictiveIntelligence

### Context
- Unified intelligence layer that combines the predictive alerts engine (`lib/alerts.ts`) with the market intelligence widget to give customer success managers a holistic, forward-looking view of customer risk and external market signals
- Sits in the Customer Intelligence Dashboard alongside CustomerHealthDisplay; receives the selected customer from CustomerSelector and a company name derived from customer data
- Designed to surface proactive signals (internal behavioural risk + external market news) in a single, cohesive panel so managers can act before problems escalate

### Requirements

**Alert Rules Engine (`lib/alerts.ts`)**
- Pure function `evaluateAlerts(customer: CustomerData, history: CustomerHistory): Alert[]`
- Five rule types evaluated on every call:
  - **Payment Risk** (High): payment overdue >30 days OR health score drops >20 pts in last 7 days
  - **Engagement Cliff** (High): current login frequency <50% of 30-day average
  - **Contract Expiration Risk** (High): contract expires in <90 days AND health score <50
  - **Support Ticket Spike** (Medium): >3 support tickets in last 7 days OR any escalated ticket open
  - **Feature Adoption Stall** (Medium): no new feature usage in 30 days for accounts with MoM growth
- Deduplication: suppress re-triggering the same rule for the same customer within cooldown window (High: 24h, Medium: 72h)
- Priority scoring: weight by customer ARR (higher ARR = higher urgency multiplier) and recency of trigger
- Each `Alert` carries: `id`, `customerId`, `priority`, `type`, `triggerSummary`, `recommendedAction`, `triggeredAt`, `cooldownUntil`

**Market Intelligence Service (`lib/marketIntelligenceService.ts`)**
- `MarketIntelligenceService` class with `getIntelligence(companyName: string): Promise<MarketIntelligenceResult>`
- Mock data generation: realistic company-specific headlines and sentiment derived deterministically from company name (reproducible for demos)
- 10-minute TTL cache; cache keyed by normalised company name
- API route: `GET /api/market-intelligence/[company]` — validates and sanitizes `company` param, returns `{ sentiment, newsCount, headlines, lastUpdated }`
- Simulate realistic network delay (300–800 ms) for authentic UX

**UI: `PredictiveIntelligenceWidget`**
- Two-panel layout within a single widget card:
  1. **Active Alerts panel**: priority-sorted list (High before Medium); each item shows priority badge, type label, trigger summary, recommended action, dismiss button; empty state when no alerts
  2. **Market Signals panel**: sentiment indicator (green/yellow/red), news count, last updated, top 3 headlines with source and date; company name input if not auto-populated
- Combined loading skeleton while both data sources resolve
- Per-panel error states that don't collapse the other panel
- Real-time refresh: re-evaluates alerts and re-fetches market data when CustomerSelector changes

**Dashboard Integration**
- Accepts `customer: CustomerData` and `history: CustomerHistory` props from parent Dashboard
- Derives `companyName` from `customer.company`; no separate input needed when customer is selected
- Follows existing widget prop/state patterns and responsive grid layout

### Constraints

- **Stack**: Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS
- **Architecture**: alert engine and market service are independently testable; no coupling between `lib/alerts.ts` and `lib/marketIntelligenceService.ts`
- **Key TypeScript interfaces**:
  ```ts
  type AlertPriority = 'high' | 'medium';
  type AlertType = 'payment_risk' | 'engagement_cliff' | 'contract_expiry' | 'support_spike' | 'feature_stall';
  interface Alert { id: string; customerId: string; priority: AlertPriority; type: AlertType; triggerSummary: string; recommendedAction: string; triggeredAt: Date; cooldownUntil: Date; }
  interface MarketIntelligenceResult { sentiment: 'positive' | 'neutral' | 'negative'; newsCount: number; headlines: Headline[]; lastUpdated: Date; }
  interface Headline { title: string; source: string; publishedAt: Date; }
  ```
- **Error classes**: `AlertEngineError`, `MarketIntelligenceError` — extend `Error` with `code` and `context`
- **Security**:
  - `company` route param: strip non-alphanumeric chars (allow spaces, hyphens); max 100 chars; return 400 on invalid
  - Alert messages must not expose raw customer PII beyond what the dashboard already shows
  - No external API calls — mock data only; prevents third-party data leakage in workshop/demo environments
- **Cooldown storage**: in-memory Map keyed by `${customerId}:${alertType}` — no persistence required
- **Cache**: in-memory Map with `{ data, expiresAt }` entries; evict on TTL expiry at read time
- **Color tokens**: sentiment positive = `#22c55e`, neutral = `#eab308`, negative = `#ef4444`; priority High badge = red, Medium = yellow — consistent with dashboard system
- **Widget size**: max width 560px; alerts panel max height 320px with overflow scroll
- **File locations**: `lib/alerts.ts`, `lib/marketIntelligenceService.ts`, `components/PredictiveIntelligenceWidget.tsx`, `app/api/market-intelligence/[company]/route.ts`

### Acceptance Criteria

- [ ] All five alert rules trigger exactly at their defined thresholds (boundary tests pass)
- [ ] No alert triggers below its defined threshold in any unit test scenario
- [ ] High-priority alerts appear before medium-priority alerts in the rendered list
- [ ] Same rule does not re-trigger for the same customer within the cooldown window
- [ ] Higher-ARR customers produce higher priority scores for equivalent alert conditions
- [ ] `evaluateAlerts` returns empty array (not error) when customer has no risk signals
- [ ] `MarketIntelligenceService.getIntelligence` returns cached result on second call within TTL
- [ ] Cache miss triggers mock data generation; cache hit skips generation
- [ ] `GET /api/market-intelligence/[company]` returns 400 for invalid company name inputs
- [ ] API response matches `{ sentiment, newsCount, headlines, lastUpdated }` schema
- [ ] Widget renders combined loading skeleton while both alerts and market data are pending
- [ ] Alerts panel shows error card (with retry) without collapsing Market Signals panel, and vice versa
- [ ] Dismissing an alert removes it from the active list (local state only)
- [ ] Widget re-fetches and re-evaluates when selected customer changes in CustomerSelector
- [ ] `companyName` is auto-populated from `customer.company`; manual input only shown when no customer selected
- [ ] Sentiment color coding matches dashboard system tokens
- [ ] Unit tests cover: all 5 alert rules, deduplication/cooldown logic, ARR priority weighting, cache TTL, API param validation, error handling
- [ ] No external HTTP calls made anywhere in the alert engine or market service
