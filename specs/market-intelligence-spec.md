# Feature: Market Intelligence Widget

## Context
- Dashboard widget providing real-time market sentiment and news analysis for a selected customer's company
- Three-layer architecture: Next.js API route → `MarketIntelligenceService` → `MarketIntelligenceWidget` UI component
- Integrated into the main Dashboard grid alongside `CustomerSelector`, `CustomerHealthDisplay`, and Domain Health widgets
- Company name is sourced from the selected `Customer` object; no manual entry required when integrated
- Uses mock data (`src/data/mock-market-intelligence.ts`) for reliable, offline-capable workshop demonstration

## Requirements

### Functional Requirements

#### API Route (`/api/market-intelligence/[company]`)
- `GET /api/market-intelligence/[company]` — returns market intelligence for the given company name
- Validates and sanitizes the `company` path parameter before processing
- Delegates to `MarketIntelligenceService` for data generation and caching
- Simulates realistic API latency (e.g., 200–500ms delay) so loading states are visible in the UI
- Returns a consistent JSON response shape on success and a structured error shape on failure

#### Service Layer (`lib/MarketIntelligenceService.ts`)
- `MarketIntelligenceService` class with a `getMarketIntelligence(company: string)` method
- In-memory cache keyed by company name with 10-minute TTL; returns cached result on repeat calls within TTL
- Uses `generateMockMarketData` and `calculateMockSentiment` from `src/data/mock-market-intelligence.ts` to produce data
- Throws `MarketIntelligenceError` (custom class extending `Error`) for validation failures or unexpected errors
- Pure, side-effect-free data assembly logic; only the cache is stateful

#### UI Component (`MarketIntelligenceWidget`)
- Accepts a `company` prop (string); fetches data from `/api/market-intelligence/[company]` on mount and when `company` changes
- Displays overall market sentiment with a color-coded indicator:
  - Green: `positive`
  - Yellow: `neutral`
  - Red: `negative`
- Displays sentiment confidence as a percentage
- Shows total article count and a "last updated" timestamp
- Renders the top 3 headlines, each with title, source name, and publication date
- Loading state: spinner or skeleton while fetch is in-flight
- Error state: user-friendly message if the API call fails; does not expose internal error details
- Refetch on `company` prop change (e.g., when user selects a different customer)

#### Dashboard Integration
- `MarketIntelligenceWidget` placed in the dashboard grid alongside other widgets
- Receives `company` from the selected `Customer` object passed down from `CustomerSelector`
- Follows the same `bg-white rounded-lg shadow p-6` card wrapper used by other dashboard sections
- Maintains responsive grid layout (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)

### Data Requirements

#### API Response Interface (`MarketIntelligenceResponse`)
```ts
interface SentimentResult {
  score: number;       // -1 to 1, normalized
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;  // 0 to 1
}

interface Headline {
  title: string;
  source: string;
  publishedAt: string; // ISO 8601
}

interface MarketIntelligenceResponse {
  company: string;
  sentiment: SentimentResult;
  articleCount: number;
  headlines: Headline[];  // max 3
  lastUpdated: string;    // ISO 8601
}
```

#### API Error Response
```ts
interface MarketIntelligenceErrorResponse {
  error: string;   // user-safe message
  code: string;    // e.g. 'INVALID_COMPANY', 'SERVICE_ERROR'
}
```

### Integration Requirements
- Color coding (`positive` → green, `neutral` → yellow, `negative` → red) must use the same Tailwind color tokens as `CustomerCard` and `CustomerHealthDisplay` (green-500 / yellow-400 / red-500 family)
- Loading and error state visual patterns consistent with other dashboard widgets
- `MarketIntelligenceWidget` is stateless beyond its internal fetch state — no shared global state

## Constraints

### Technical Stack
- Next.js 15 App Router — API route implemented as a Route Handler (`app/api/market-intelligence/[company]/route.ts`)
- React 19, TypeScript strict mode
- Tailwind CSS only (no custom CSS files)
- No external HTTP calls — all data from `src/data/mock-market-intelligence.ts`

### File Structure and Naming
| Artifact | Path |
|---|---|
| API route | `app/api/market-intelligence/[company]/route.ts` |
| Service class | `lib/MarketIntelligenceService.ts` |
| UI component | `components/MarketIntelligenceWidget.tsx` |
| Shared types | `lib/marketIntelligenceTypes.ts` (exported and imported by both API route and component) |

- Props interface: `MarketIntelligenceWidgetProps` exported from `components/MarketIntelligenceWidget.tsx`
- Custom error: `MarketIntelligenceError extends Error` exported from `lib/MarketIntelligenceService.ts`

### Performance Requirements
- Cache TTL: 10 minutes per company name; repeat calls within TTL skip mock data re-generation
- Simulated API delay: 200–500ms (configurable constant, not hardcoded)
- UI must not block the rest of the dashboard during data fetch — widget fetches independently

### Design Constraints
- Sentiment color mapping:
  - `positive` → `text-green-600` / `bg-green-100` (or equivalent)
  - `neutral` → `text-yellow-600` / `bg-yellow-100`
  - `negative` → `text-red-600` / `bg-red-100`
- Widget card wrapper: `bg-white rounded-lg shadow p-6` (matches existing dashboard sections)
- Headlines list: title as primary text, source + date as muted secondary text (`text-sm text-gray-500`)
- Maximum 3 headlines displayed regardless of `articleCount`

### Security Considerations
- `company` path parameter validated: non-empty string, max 100 characters, alphanumeric + spaces/hyphens only; return `400` with `INVALID_COMPANY` code otherwise
- Input sanitized before passing to mock data generator to prevent template injection in generated headline strings
- Error responses must not leak stack traces, file paths, or service internals
- `MarketIntelligenceError` messages are safe to surface in `code` field; full error details logged server-side only

## Acceptance Criteria

### API Route
- [ ] `GET /api/market-intelligence/[company]` returns `200` with a valid `MarketIntelligenceResponse` JSON body for a valid company name
- [ ] Response includes `sentiment`, `articleCount` (≤ 3 headlines), `headlines` array, and `lastUpdated`
- [ ] Invalid company name (empty, too long, or disallowed characters) returns `400` with `INVALID_COMPANY` error code
- [ ] Response is served from cache on repeat requests within 10-minute TTL (same `lastUpdated` timestamp)
- [ ] Simulated delay is present and observable (response does not return instantaneously)
- [ ] No internal error details or stack traces appear in the response body

### Service Layer
- [ ] `MarketIntelligenceService.getMarketIntelligence` returns a `MarketIntelligenceResponse`-shaped object
- [ ] Cache returns the same result within 10-minute TTL without re-invoking mock data functions
- [ ] Cache entry expires after TTL and fresh data is generated on the next call
- [ ] `MarketIntelligenceError` is thrown (not a generic Error) for invalid input
- [ ] All exported functions and classes pass TypeScript strict mode checks

### UI Component
- [ ] Renders sentiment label and color-coded indicator matching `positive`/`neutral`/`negative` values
- [ ] Renders article count and a formatted "last updated" timestamp
- [ ] Renders up to 3 headlines with title, source, and publication date
- [ ] Displays a loading state (spinner or skeleton) while the API request is in-flight
- [ ] Displays a user-friendly error message (no raw error details) when the API call fails
- [ ] Re-fetches data when the `company` prop changes
- [ ] Sentiment colors match the green/yellow/red tokens used in `CustomerCard` and `CustomerHealthDisplay`
- [ ] `MarketIntelligenceWidgetProps` TypeScript interface exported from component file
- [ ] No console errors or warnings during render or interaction

### Dashboard Integration
- [ ] `MarketIntelligenceWidget` renders in the dashboard grid without breaking the responsive layout
- [ ] Widget receives `company` from the selected customer and updates when selection changes
- [ ] Widget card styling matches other dashboard widget sections
