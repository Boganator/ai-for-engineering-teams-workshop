// ─── Weights ─────────────────────────────────────────────────────────────────
const WEIGHT_PAYMENT = 0.4;
const WEIGHT_ENGAGEMENT = 0.3;
const WEIGHT_CONTRACT = 0.2;
const WEIGHT_SUPPORT = 0.1;

// ─── Risk-level thresholds ────────────────────────────────────────────────────
const THRESHOLD_CRITICAL_MAX = 30;
const THRESHOLD_WARNING_MAX = 70;

// ─── Neutral defaults (for new/missing data) ──────────────────────────────────
const DEFAULT_NEUTRAL_SCORE = 50;

// ─── Scoring constants ────────────────────────────────────────────────────────
/** Days beyond which a payment is considered significantly late */
const PAYMENT_LATE_DAYS_MAX = 90;
/** Max average payment delay treated as perfect (0 days) through worst (60+ days) */
const PAYMENT_DELAY_DAYS_MAX = 60;
/** Overdue amount above which the score bottoms out */
const PAYMENT_OVERDUE_MAX = 10000;

/** Logins per month above which engagement is perfect */
const ENGAGEMENT_LOGINS_MAX = 30;
/** Feature usages above which engagement is perfect */
const ENGAGEMENT_FEATURES_MAX = 20;
/** Open tickets above which engagement score is penalised to zero */
const ENGAGEMENT_TICKETS_MAX = 10;

/** Days until renewal above which contract score is perfect */
const CONTRACT_RENEWAL_DAYS_MAX = 365;
/** Contract value above which value sub-score is perfect */
const CONTRACT_VALUE_MAX = 100000;

/** Resolution hours above which support score is penalised to zero */
const SUPPORT_RESOLUTION_MAX = 72;
/** Max satisfaction scale */
const SUPPORT_SATISFACTION_MAX = 5;
/** Escalations above which support score bottoms out */
const SUPPORT_ESCALATION_MAX = 5;

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PaymentData {
  daysSinceLastPayment: number;
  averagePaymentDelayDays: number;
  overdueAmount: number;
}

export interface EngagementData {
  loginsPerMonth: number;
  featureUsageCount: number;
  openSupportTickets: number;
}

export interface ContractData {
  daysUntilRenewal: number;
  contractValue: number;
  recentUpgrade: boolean;
}

export interface SupportData {
  averageResolutionTimeHours: number;
  averageSatisfactionScore: number; // 1–5
  escalationCount: number;
}

export interface HealthScoreInput {
  payment: PaymentData;
  engagement: EngagementData;
  contract: ContractData;
  support: SupportData;
}

export type RiskLevel = 'healthy' | 'warning' | 'critical';

export interface FactorBreakdown {
  payment: number;    // 0–100
  engagement: number; // 0–100
  contract: number;   // 0–100
  support: number;    // 0–100
}

export interface HealthScoreResult {
  score: number;        // 0–100, weighted composite
  riskLevel: RiskLevel;
  breakdown: FactorBreakdown;
}

// ─── Validation error ─────────────────────────────────────────────────────────

export class HealthScoreValidationError extends Error {
  constructor(field: string, value: unknown, expected: string) {
    super(`Invalid value for "${field}": got ${value}. Expected ${expected}.`);
    this.name = 'HealthScoreValidationError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Clamps a value to [0, 100]. */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Validates that a value is a finite number ≥ 0. */
function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new HealthScoreValidationError(field, value, 'a finite number ≥ 0');
  }
}

/** Validates that a value is within [min, max]. */
function assertInRange(value: number, field: string, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new HealthScoreValidationError(field, value, `a number between ${min} and ${max}`);
  }
}

// ─── Factor scoring functions ─────────────────────────────────────────────────

/**
 * Calculates a payment health sub-score (0–100).
 *
 * Formula:
 *   recencyScore  = clamp(100 - (daysSinceLastPayment / PAYMENT_LATE_DAYS_MAX) * 100)
 *   delayScore    = clamp(100 - (averagePaymentDelayDays / PAYMENT_DELAY_DAYS_MAX) * 100)
 *   overdueScore  = clamp(100 - (overdueAmount / PAYMENT_OVERDUE_MAX) * 100)
 *   result        = (recencyScore + delayScore + overdueScore) / 3
 *
 * Edge cases:
 *   - New customers with no payment history (all zeros) → neutral score of 50.
 *   - All sub-inputs zero → returns DEFAULT_NEUTRAL_SCORE.
 *
 * @param data - Payment history data
 * @returns Score in [0, 100]
 */
export function calculatePaymentScore(data: PaymentData): number {
  assertNonNegative(data.daysSinceLastPayment, 'payment.daysSinceLastPayment');
  assertNonNegative(data.averagePaymentDelayDays, 'payment.averagePaymentDelayDays');
  assertNonNegative(data.overdueAmount, 'payment.overdueAmount');

  // New customer — no history yet; return neutral default
  if (
    data.daysSinceLastPayment === 0 &&
    data.averagePaymentDelayDays === 0 &&
    data.overdueAmount === 0
  ) {
    return DEFAULT_NEUTRAL_SCORE;
  }

  const recencyScore = clamp(100 - (data.daysSinceLastPayment / PAYMENT_LATE_DAYS_MAX) * 100);
  const delayScore = clamp(100 - (data.averagePaymentDelayDays / PAYMENT_DELAY_DAYS_MAX) * 100);
  const overdueScore = clamp(100 - (data.overdueAmount / PAYMENT_OVERDUE_MAX) * 100);

  return clamp((recencyScore + delayScore + overdueScore) / 3);
}

/**
 * Calculates an engagement sub-score (0–100).
 *
 * Formula:
 *   loginScore    = clamp((loginsPerMonth / ENGAGEMENT_LOGINS_MAX) * 100)
 *   featureScore  = clamp((featureUsageCount / ENGAGEMENT_FEATURES_MAX) * 100)
 *   ticketPenalty = clamp((openSupportTickets / ENGAGEMENT_TICKETS_MAX) * 100)
 *   result        = clamp((loginScore + featureScore) / 2 - ticketPenalty * 0.5)
 *
 * Edge cases:
 *   - All-zero inputs (new customer) → DEFAULT_NEUTRAL_SCORE.
 *
 * @param data - Engagement metrics
 * @returns Score in [0, 100]
 */
export function calculateEngagementScore(data: EngagementData): number {
  assertNonNegative(data.loginsPerMonth, 'engagement.loginsPerMonth');
  assertNonNegative(data.featureUsageCount, 'engagement.featureUsageCount');
  assertNonNegative(data.openSupportTickets, 'engagement.openSupportTickets');

  if (
    data.loginsPerMonth === 0 &&
    data.featureUsageCount === 0 &&
    data.openSupportTickets === 0
  ) {
    return DEFAULT_NEUTRAL_SCORE;
  }

  const loginScore = clamp((data.loginsPerMonth / ENGAGEMENT_LOGINS_MAX) * 100);
  const featureScore = clamp((data.featureUsageCount / ENGAGEMENT_FEATURES_MAX) * 100);
  const ticketPenalty = clamp((data.openSupportTickets / ENGAGEMENT_TICKETS_MAX) * 100);

  return clamp((loginScore + featureScore) / 2 - ticketPenalty * 0.5);
}

/**
 * Calculates a contract health sub-score (0–100).
 *
 * Formula:
 *   renewalScore  = clamp((daysUntilRenewal / CONTRACT_RENEWAL_DAYS_MAX) * 100)
 *   valueScore    = clamp((contractValue / CONTRACT_VALUE_MAX) * 100)
 *   upgradeBonus  = recentUpgrade ? 10 : 0
 *   result        = clamp((renewalScore + valueScore) / 2 + upgradeBonus)
 *
 * Edge cases:
 *   - New customers with no contract data (all zeros, no upgrade) → DEFAULT_NEUTRAL_SCORE.
 *
 * @param data - Contract details
 * @returns Score in [0, 100]
 */
export function calculateContractScore(data: ContractData): number {
  assertNonNegative(data.daysUntilRenewal, 'contract.daysUntilRenewal');
  assertNonNegative(data.contractValue, 'contract.contractValue');

  if (
    data.daysUntilRenewal === 0 &&
    data.contractValue === 0 &&
    !data.recentUpgrade
  ) {
    return DEFAULT_NEUTRAL_SCORE;
  }

  const renewalScore = clamp((data.daysUntilRenewal / CONTRACT_RENEWAL_DAYS_MAX) * 100);
  const valueScore = clamp((data.contractValue / CONTRACT_VALUE_MAX) * 100);
  const upgradeBonus = data.recentUpgrade ? 10 : 0;

  return clamp((renewalScore + valueScore) / 2 + upgradeBonus);
}

/**
 * Calculates a support satisfaction sub-score (0–100).
 *
 * Formula:
 *   resolutionScore   = clamp(100 - (averageResolutionTimeHours / SUPPORT_RESOLUTION_MAX) * 100)
 *   satisfactionScore = clamp(((averageSatisfactionScore - 1) / (SUPPORT_SATISFACTION_MAX - 1)) * 100)
 *   escalationPenalty = clamp((escalationCount / SUPPORT_ESCALATION_MAX) * 100)
 *   result            = clamp((resolutionScore + satisfactionScore) / 2 - escalationPenalty * 0.3)
 *
 * Edge cases:
 *   - All-zero inputs (new customer) → DEFAULT_NEUTRAL_SCORE.
 *   - averageSatisfactionScore must be in [1, 5]; throws HealthScoreValidationError otherwise.
 *
 * @param data - Support interaction data
 * @returns Score in [0, 100]
 */
export function calculateSupportScore(data: SupportData): number {
  assertNonNegative(data.averageResolutionTimeHours, 'support.averageResolutionTimeHours');
  assertInRange(data.averageSatisfactionScore, 'support.averageSatisfactionScore', 1, 5);
  assertNonNegative(data.escalationCount, 'support.escalationCount');

  if (
    data.averageResolutionTimeHours === 0 &&
    data.averageSatisfactionScore === 1 &&
    data.escalationCount === 0
  ) {
    return DEFAULT_NEUTRAL_SCORE;
  }

  const resolutionScore = clamp(100 - (data.averageResolutionTimeHours / SUPPORT_RESOLUTION_MAX) * 100);
  const satisfactionScore = clamp(((data.averageSatisfactionScore - 1) / (SUPPORT_SATISFACTION_MAX - 1)) * 100);
  const escalationPenalty = clamp((data.escalationCount / SUPPORT_ESCALATION_MAX) * 100);

  return clamp((resolutionScore + satisfactionScore) / 2 - escalationPenalty * 0.3);
}

/**
 * Classifies a composite score into a risk level.
 *
 * Thresholds:
 *   0–30   → 'critical'
 *   31–70  → 'warning'
 *   71–100 → 'healthy'
 *
 * @param score - Composite score in [0, 100]
 * @returns RiskLevel
 */
function classifyRiskLevel(score: number): RiskLevel {
  if (score <= THRESHOLD_CRITICAL_MAX) return 'critical';
  if (score <= THRESHOLD_WARNING_MAX) return 'warning';
  return 'healthy';
}

/**
 * Calculates the composite customer health score.
 *
 * Formula:
 *   score = (payment × 0.4) + (engagement × 0.3) + (contract × 0.2) + (support × 0.1)
 *
 * Returns the overall score (0–100), risk level, and per-factor breakdown.
 * Throws `HealthScoreValidationError` for any invalid input value.
 *
 * @param data - Full set of health input factors
 * @returns HealthScoreResult containing score, riskLevel, and breakdown
 */
export function calculateHealthScore(data: HealthScoreInput): HealthScoreResult {
  const payment = calculatePaymentScore(data.payment);
  const engagement = calculateEngagementScore(data.engagement);
  const contract = calculateContractScore(data.contract);
  const support = calculateSupportScore(data.support);

  const score = clamp(
    payment * WEIGHT_PAYMENT +
    engagement * WEIGHT_ENGAGEMENT +
    contract * WEIGHT_CONTRACT +
    support * WEIGHT_SUPPORT
  );

  return {
    score: Math.round(score),
    riskLevel: classifyRiskLevel(score),
    breakdown: { payment, engagement, contract, support },
  };
}
