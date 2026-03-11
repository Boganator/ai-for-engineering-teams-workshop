// ─── Weights ──────────────────────────────────────────────────────────────────
const WEIGHT_PAYMENT = 0.4;
const WEIGHT_ENGAGEMENT = 0.3;
const WEIGHT_CONTRACT = 0.2;
const WEIGHT_SUPPORT = 0.1;

// ─── Risk thresholds ──────────────────────────────────────────────────────────
const THRESHOLD_CRITICAL_MAX = 30;
const THRESHOLD_WARNING_MAX = 70;

// ─── Scoring normalisation caps ───────────────────────────────────────────────
const PAYMENT_OVERDUE_DAYS_MAX = 90;
const PAYMENT_DELAY_DAYS_MAX = 60;
const PAYMENT_OVERDUE_USD_MAX = 10000;
const ENGAGEMENT_LOGINS_PER_WEEK_MAX = 7;
const ENGAGEMENT_FEATURES_MAX = 20;
const ENGAGEMENT_TICKETS_MAX = 10;
const CONTRACT_RENEWAL_DAYS_MAX = 365;
const CONTRACT_VALUE_USD_MAX = 100000;
const SUPPORT_RESOLUTION_DAYS_MAX = 14;
const SUPPORT_SATISFACTION_MAX = 10;
const SUPPORT_ESCALATION_MAX = 5;

// ─── Alert rule thresholds ────────────────────────────────────────────────────
const ALERT_PAYMENT_OVERDUE_DAYS = 30;
const ALERT_SCORE_DROP_THRESHOLD = 20;
const ALERT_SCORE_DROP_WINDOW_DAYS = 7;
const ALERT_LOGIN_DROP_PERCENT = 0.5;        // >50% drop
const ALERT_CONTRACT_EXPIRY_DAYS = 90;
const ALERT_CONTRACT_LOW_SCORE = 50;
const ALERT_SUPPORT_TICKETS_THRESHOLD = 3;
const ALERT_FEATURE_STALL_DAYS = 30;

// ─── Alert cooldown (ms) ──────────────────────────────────────────────────────
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PaymentData {
  daysSinceLastPayment: number;
  avgPaymentDelayDays: number;
  overdueAmountUsd: number;
}

export interface EngagementData {
  loginFrequencyPerWeek: number;
  featureUsageCount: number;
  openSupportTickets: number;
}

export interface ContractData {
  daysUntilRenewal: number;
  contractValueUsd: number;
  recentUpgrades: number;
}

export interface SupportData {
  avgResolutionTimeDays: number;
  satisfactionScore: number; // 0–10
  escalationCount: number;
}

export interface HealthScoreSnapshot {
  date: Date;
  score: number;
}

export interface HealthHistory {
  /** Recent health score snapshots for trend detection */
  healthScoreSeries?: HealthScoreSnapshot[];
  /** 30-day average login frequency per week for drop detection */
  previousLoginFrequencyPerWeek?: number;
  /** Days since any new feature was last used (for Feature Stall rule) */
  daysSinceLastFeatureUsage?: number;
  /** Whether the account is classified as growing (for Feature Stall rule) */
  isGrowingAccount?: boolean;
}

export interface CustomerHealthInput {
  payment: PaymentData;
  engagement: EngagementData;
  contract: ContractData;
  support: SupportData;
  history?: HealthHistory;
}

export type RiskLevel = 'healthy' | 'warning' | 'critical';

export interface FactorScores {
  payment: number;    // 0–100
  engagement: number; // 0–100
  contract: number;   // 0–100
  support: number;    // 0–100
}

export interface HealthScoreResult {
  score: number;
  riskLevel: RiskLevel;
  breakdown: FactorScores;
}

export interface Alert {
  id: string;
  customerId: string;
  priority: 'high' | 'medium';
  type: string;
  message: string;
  recommendedAction: string;
  triggeredAt: Date;
}

// ─── Custom errors ────────────────────────────────────────────────────────────

export class HealthCalculationError extends Error {
  constructor(field: string, value: unknown, expected: string) {
    super(`HealthCalculationError: invalid value for "${field}": got ${String(value)}. Expected ${expected}.`);
    this.name = 'HealthCalculationError';
  }
}

export class AlertEngineError extends Error {
  constructor(message: string) {
    super(`AlertEngineError: ${message}`);
    this.name = 'AlertEngineError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function assertFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new HealthCalculationError(field, value, 'a finite number ≥ 0');
  }
}

function assertInRange(value: number, field: string, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new HealthCalculationError(field, value, `a number between ${min} and ${max}`);
  }
}

// ─── Factor scoring ───────────────────────────────────────────────────────────

/**
 * Calculates payment factor score (0–100).
 *
 * Formula:
 *   recency  = clamp(100 - (daysSinceLastPayment / PAYMENT_OVERDUE_DAYS_MAX) * 100)
 *   delay    = clamp(100 - (avgPaymentDelayDays / PAYMENT_DELAY_DAYS_MAX) * 100)
 *   overdue  = clamp(100 - (overdueAmountUsd / PAYMENT_OVERDUE_USD_MAX) * 100)
 *   result   = (recency + delay + overdue) / 3
 *
 * New customer (all zeros) → returns 50 (neutral default, documented).
 */
export function calculatePaymentScore(data: PaymentData): number {
  assertFiniteNonNegative(data.daysSinceLastPayment, 'payment.daysSinceLastPayment');
  assertFiniteNonNegative(data.avgPaymentDelayDays, 'payment.avgPaymentDelayDays');
  assertFiniteNonNegative(data.overdueAmountUsd, 'payment.overdueAmountUsd');

  if (data.daysSinceLastPayment === 0 && data.avgPaymentDelayDays === 0 && data.overdueAmountUsd === 0) {
    return 50; // neutral default for new customers with no payment history
  }

  return clamp(
    (
      clamp(100 - (data.daysSinceLastPayment / PAYMENT_OVERDUE_DAYS_MAX) * 100) +
      clamp(100 - (data.avgPaymentDelayDays / PAYMENT_DELAY_DAYS_MAX) * 100) +
      clamp(100 - (data.overdueAmountUsd / PAYMENT_OVERDUE_USD_MAX) * 100)
    ) / 3
  );
}

/**
 * Calculates engagement factor score (0–100).
 *
 * Formula:
 *   loginScore   = clamp((loginFrequencyPerWeek / ENGAGEMENT_LOGINS_PER_WEEK_MAX) * 100)
 *   featureScore = clamp((featureUsageCount / ENGAGEMENT_FEATURES_MAX) * 100)
 *   ticketPenalty = clamp((openSupportTickets / ENGAGEMENT_TICKETS_MAX) * 100)
 *   result = clamp((loginScore + featureScore) / 2 - ticketPenalty * 0.5)
 *
 * New customer (all zeros) → returns 50 (neutral default).
 */
export function calculateEngagementScore(data: EngagementData): number {
  assertFiniteNonNegative(data.loginFrequencyPerWeek, 'engagement.loginFrequencyPerWeek');
  assertFiniteNonNegative(data.featureUsageCount, 'engagement.featureUsageCount');
  assertFiniteNonNegative(data.openSupportTickets, 'engagement.openSupportTickets');

  if (data.loginFrequencyPerWeek === 0 && data.featureUsageCount === 0 && data.openSupportTickets === 0) {
    return 50;
  }

  const loginScore = clamp((data.loginFrequencyPerWeek / ENGAGEMENT_LOGINS_PER_WEEK_MAX) * 100);
  const featureScore = clamp((data.featureUsageCount / ENGAGEMENT_FEATURES_MAX) * 100);
  const ticketPenalty = clamp((data.openSupportTickets / ENGAGEMENT_TICKETS_MAX) * 100);

  return clamp((loginScore + featureScore) / 2 - ticketPenalty * 0.5);
}

/**
 * Calculates contract factor score (0–100).
 *
 * Formula:
 *   renewalScore = clamp((daysUntilRenewal / CONTRACT_RENEWAL_DAYS_MAX) * 100)
 *   valueScore   = clamp((contractValueUsd / CONTRACT_VALUE_USD_MAX) * 100)
 *   upgradeBonus = recentUpgrades > 0 ? 10 : 0
 *   result = clamp((renewalScore + valueScore) / 2 + upgradeBonus)
 *
 * New customer (all zeros, no upgrades) → returns 50 (neutral default).
 */
export function calculateContractScore(data: ContractData): number {
  assertFiniteNonNegative(data.daysUntilRenewal, 'contract.daysUntilRenewal');
  assertFiniteNonNegative(data.contractValueUsd, 'contract.contractValueUsd');
  assertFiniteNonNegative(data.recentUpgrades, 'contract.recentUpgrades');

  if (data.daysUntilRenewal === 0 && data.contractValueUsd === 0 && data.recentUpgrades === 0) {
    return 50;
  }

  const renewalScore = clamp((data.daysUntilRenewal / CONTRACT_RENEWAL_DAYS_MAX) * 100);
  const valueScore = clamp((data.contractValueUsd / CONTRACT_VALUE_USD_MAX) * 100);
  const upgradeBonus = data.recentUpgrades > 0 ? 10 : 0;

  return clamp((renewalScore + valueScore) / 2 + upgradeBonus);
}

/**
 * Calculates support factor score (0–100).
 *
 * Formula:
 *   resolutionScore   = clamp(100 - (avgResolutionTimeDays / SUPPORT_RESOLUTION_DAYS_MAX) * 100)
 *   satisfactionScore = clamp((satisfactionScore / SUPPORT_SATISFACTION_MAX) * 100)
 *   escalationPenalty = clamp((escalationCount / SUPPORT_ESCALATION_MAX) * 100)
 *   result = clamp((resolutionScore + satisfactionScore) / 2 - escalationPenalty * 0.3)
 *
 * satisfactionScore must be in [0, 10]; throws HealthCalculationError otherwise.
 * New customer (all zeros) → returns 50 (neutral default).
 */
export function calculateSupportScore(data: SupportData): number {
  assertFiniteNonNegative(data.avgResolutionTimeDays, 'support.avgResolutionTimeDays');
  assertInRange(data.satisfactionScore, 'support.satisfactionScore', 0, 10);
  assertFiniteNonNegative(data.escalationCount, 'support.escalationCount');

  if (data.avgResolutionTimeDays === 0 && data.satisfactionScore === 0 && data.escalationCount === 0) {
    return 50;
  }

  const resolutionScore = clamp(100 - (data.avgResolutionTimeDays / SUPPORT_RESOLUTION_DAYS_MAX) * 100);
  const satisfactionScore = clamp((data.satisfactionScore / SUPPORT_SATISFACTION_MAX) * 100);
  const escalationPenalty = clamp((data.escalationCount / SUPPORT_ESCALATION_MAX) * 100);

  return clamp((resolutionScore + satisfactionScore) / 2 - escalationPenalty * 0.3);
}

/**
 * Classifies a composite score into a risk level.
 *
 * Thresholds: 0–30 → 'critical', 31–70 → 'warning', 71–100 → 'healthy'.
 */
function classifyRiskLevel(score: number): RiskLevel {
  if (score <= THRESHOLD_CRITICAL_MAX) return 'critical';
  if (score <= THRESHOLD_WARNING_MAX) return 'warning';
  return 'healthy';
}

/**
 * Calculates the composite customer health score.
 *
 * Formula: score = (payment × 0.4) + (engagement × 0.3) + (contract × 0.2) + (support × 0.1)
 *
 * Throws `HealthCalculationError` for any invalid input field.
 * Missing `history` is treated as a new customer (no history); neutral defaults applied per factor.
 *
 * @param input - Full set of customer health input factors
 * @returns HealthScoreResult with score, riskLevel, and per-factor breakdown
 */
export function calculateHealthScore(input: CustomerHealthInput): HealthScoreResult {
  const payment = calculatePaymentScore(input.payment);
  const engagement = calculateEngagementScore(input.engagement);
  const contract = calculateContractScore(input.contract);
  const support = calculateSupportScore(input.support);

  const raw =
    payment * WEIGHT_PAYMENT +
    engagement * WEIGHT_ENGAGEMENT +
    contract * WEIGHT_CONTRACT +
    support * WEIGHT_SUPPORT;

  const score = Math.round(clamp(raw));

  return {
    score,
    riskLevel: classifyRiskLevel(score),
    breakdown: { payment, engagement, contract, support },
  };
}

// ─── Alert engine ─────────────────────────────────────────────────────────────

interface AlertCandidate {
  type: string;
  priority: 'high' | 'medium';
  message: string;
  recommendedAction: string;
}

/**
 * Evaluates alert rules for a given customer and returns a deduplicated,
 * priority-sorted list of active alerts.
 *
 * Rules:
 *   High:   Payment overdue > 30 days
 *   High:   Health score dropped > 20 pts in last 7 days (requires history.healthScoreSeries)
 *   High:   Login frequency dropped > 50% vs. 30-day average (requires history.previousLoginFrequencyPerWeek)
 *   High:   Contract expires < 90 days AND health score < 50
 *   Medium: > 3 open support tickets OR escalationCount > 0 (Support Spike)
 *   Medium: No new feature usage in 30 days for growing accounts (Feature Stall)
 *
 * Deduplication: one alert per (customerId, type); cooldown of 24 hours.
 * Throws `AlertEngineError` for missing customerId.
 *
 * @param customerId - Identifier for the customer
 * @param input - Customer health input data
 * @param scoreResult - Pre-computed health score result
 * @param existingAlerts - Currently active alerts for deduplication / cooldown checks
 * @returns Sorted alert list (high first, then medium)
 */
export function evaluateAlerts(
  customerId: string,
  input: CustomerHealthInput,
  scoreResult: HealthScoreResult,
  existingAlerts: Alert[] = []
): Alert[] {
  if (!customerId || typeof customerId !== 'string') {
    throw new AlertEngineError('customerId must be a non-empty string');
  }

  const candidates: AlertCandidate[] = [];

  // Rule 1 — High: Payment overdue > 30 days
  if (input.payment.daysSinceLastPayment > ALERT_PAYMENT_OVERDUE_DAYS) {
    candidates.push({
      type: 'PAYMENT_OVERDUE',
      priority: 'high',
      message: `Payment is ${input.payment.daysSinceLastPayment} days overdue.`,
      recommendedAction: 'Contact the customer to arrange immediate payment.',
    });
  }

  // Rule 2 — High: Health score dropped > 20 pts in last 7 days
  const history = input.history;
  if (history?.healthScoreSeries && history.healthScoreSeries.length >= 2) {
    const cutoff = new Date(Date.now() - ALERT_SCORE_DROP_WINDOW_DAYS * 86_400_000);
    const recent = history.healthScoreSeries.filter((s) => s.date >= cutoff);
    if (recent.length >= 2) {
      const earliest = recent[0].score;
      const drop = earliest - scoreResult.score;
      if (drop > ALERT_SCORE_DROP_THRESHOLD) {
        candidates.push({
          type: 'HEALTH_SCORE_DROP',
          priority: 'high',
          message: `Health score dropped by ${drop} points in the last 7 days.`,
          recommendedAction: 'Schedule an urgent account review with the customer.',
        });
      }
    }
  }

  // Rule 3 — High: Login frequency dropped > 50% vs. 30-day average (Engagement Cliff)
  if (
    history?.previousLoginFrequencyPerWeek !== undefined &&
    history.previousLoginFrequencyPerWeek > 0 &&
    input.engagement.loginFrequencyPerWeek <
      history.previousLoginFrequencyPerWeek * (1 - ALERT_LOGIN_DROP_PERCENT)
  ) {
    candidates.push({
      type: 'ENGAGEMENT_CLIFF',
      priority: 'high',
      message: `Login frequency dropped more than 50% vs. 30-day average.`,
      recommendedAction: 'Reach out to understand adoption blockers and offer training.',
    });
  }

  // Rule 4 — High: Contract expires < 90 days AND health score < 50
  if (
    input.contract.daysUntilRenewal < ALERT_CONTRACT_EXPIRY_DAYS &&
    scoreResult.score < ALERT_CONTRACT_LOW_SCORE
  ) {
    candidates.push({
      type: 'CONTRACT_EXPIRY_RISK',
      priority: 'high',
      message: `Contract expires in ${input.contract.daysUntilRenewal} days with a low health score of ${scoreResult.score}.`,
      recommendedAction: 'Initiate renewal conversation and offer retention incentives.',
    });
  }

  // Rule 5a — Medium: > 3 open support tickets OR escalated ticket (Support Spike)
  if (
    input.engagement.openSupportTickets > ALERT_SUPPORT_TICKETS_THRESHOLD ||
    input.support.escalationCount > 0
  ) {
    candidates.push({
      type: 'SUPPORT_SPIKE',
      priority: 'medium',
      message: `${input.engagement.openSupportTickets} open tickets${input.support.escalationCount > 0 ? ' with escalations' : ''}.`,
      recommendedAction: 'Assign a dedicated support contact and fast-track open tickets.',
    });
  }

  // Rule 5b — Medium: No new feature usage in 30 days for growing accounts (Feature Stall)
  if (
    history?.isGrowingAccount &&
    history.daysSinceLastFeatureUsage !== undefined &&
    history.daysSinceLastFeatureUsage > ALERT_FEATURE_STALL_DAYS
  ) {
    candidates.push({
      type: 'FEATURE_STALL',
      priority: 'medium',
      message: `No new feature usage in ${history.daysSinceLastFeatureUsage} days for a growing account.`,
      recommendedAction: 'Schedule a product walkthrough and highlight unused high-value features.',
    });
  }

  // Deduplication + cooldown
  const now = Date.now();
  const existingMap = new Map<string, Alert>(
    existingAlerts.map((a) => [`${a.customerId}:${a.type}`, a])
  );

  const newAlerts: Alert[] = [];
  for (const candidate of candidates) {
    const key = `${customerId}:${candidate.type}`;
    const existing = existingMap.get(key);
    if (existing && now - existing.triggeredAt.getTime() < ALERT_COOLDOWN_MS) {
      // Within cooldown — carry existing alert forward
      newAlerts.push(existing);
    } else {
      newAlerts.push({
        id: `${key}-${now}`,
        customerId,
        priority: candidate.priority,
        type: candidate.type,
        message: candidate.message,
        recommendedAction: candidate.recommendedAction,
        triggeredAt: new Date(now),
      });
    }
  }

  // Sort: high first, then medium; stable within priority
  return newAlerts.sort((a, b) =>
    a.priority === b.priority ? 0 : a.priority === 'high' ? -1 : 1
  );
}

// ─── Predictive intelligence interfaces ───────────────────────────────────────

export type PredictiveAlertPriority = 'high' | 'medium';
export type PredictiveAlertType =
  | 'payment_risk'
  | 'engagement_cliff'
  | 'contract_expiry'
  | 'support_spike'
  | 'feature_stall';

export interface PredictiveAlert {
  id: string;
  customerId: string;
  priority: PredictiveAlertPriority;
  type: PredictiveAlertType;
  triggerSummary: string;
  recommendedAction: string;
  triggeredAt: Date;
  cooldownUntil: Date;
  /** Composite urgency score; higher = more urgent. Used to sort within same priority. */
  urgencyScore: number;
}

export interface CustomerData {
  id: string;
  company: string;
  healthScore: number;
  annualRecurringRevenue?: number; // USD; used for urgency weighting
  payment: {
    daysSinceLastPayment: number;
    overdueAmountUsd?: number;
  };
  engagement: {
    loginFrequencyPerWeek: number;
    openSupportTickets: number;
    escalationCount?: number;
  };
  contract: {
    daysUntilRenewal: number;
  };
}

export interface CustomerHistory {
  previousHealthScores?: Array<{ date: Date; score: number }>;
  /** 30-day average login frequency (logins/week) for Engagement Cliff rule */
  previousLoginFrequencyPerWeek?: number;
  /** Days since any new feature was last used (for Feature Adoption Stall rule) */
  daysSinceLastFeatureUsage?: number;
  /** Whether the account shows month-over-month growth */
  isGrowingAccount?: boolean;
  /** Number of support tickets opened in the last 7 days */
  recentSupportTicketCount?: number;
}

// ─── Predictive cooldown constants ───────────────────────────────────────────
const PREDICTIVE_COOLDOWN_HIGH_MS = 24 * 60 * 60 * 1000;  // 24 hours
const PREDICTIVE_COOLDOWN_MEDIUM_MS = 72 * 60 * 60 * 1000; // 72 hours

/** In-memory cooldown store: key = `${customerId}:${alertType}` → cooldownUntil */
const predictiveCooldownMap = new Map<string, Date>();

/** Returns the urgency score for an alert: base from priority + ARR multiplier. */
function calcUrgencyScore(priority: PredictiveAlertPriority, arr: number): number {
  const base = priority === 'high' ? 100 : 50;
  // +1 urgency per $100k ARR, capped at 50
  const arrBonus = Math.min(50, Math.floor(arr / 100_000));
  return base + arrBonus;
}

/**
 * Evaluates all five predictive alert rules for a customer.
 *
 * Rules (see spec for exact thresholds):
 *   High:   payment_risk — overdue >30 days OR score drop >20 pts in 7 days
 *   High:   engagement_cliff — login frequency <50% of 30-day average
 *   High:   contract_expiry — expires <90 days AND health score <50
 *   Medium: support_spike — >3 tickets in 7 days OR any escalated ticket
 *   Medium: feature_stall — no feature usage in 30 days for growing accounts
 *
 * Deduplication: suppresses re-triggering within cooldown (High: 24h, Medium: 72h).
 * Priority scoring: weighted by ARR so higher-ARR customers sort first within same priority.
 *
 * @param customer - Customer data including real-time metrics
 * @param history  - Historical signals; missing history defaults to safe no-op per rule
 * @returns Priority+urgency sorted alert list; empty array if no risk signals
 */
export function evaluatePredictiveAlerts(
  customer: CustomerData,
  history?: CustomerHistory
): PredictiveAlert[] {
  if (!customer?.id) {
    throw new AlertEngineError('customer.id must be a non-empty string');
  }

  const arr = customer.annualRecurringRevenue ?? 0;
  const now = Date.now();
  const alerts: PredictiveAlert[] = [];

  const scoreDropDays7 = (() => {
    if (!history?.previousHealthScores || history.previousHealthScores.length < 2) return 0;
    const cutoff = new Date(now - ALERT_SCORE_DROP_WINDOW_DAYS * 86_400_000);
    const recent = history.previousHealthScores.filter((s) => s.date >= cutoff);
    if (recent.length < 2) return 0;
    return recent[0].score - customer.healthScore;
  })();

  // Helper: build and conditionally push alert if not in cooldown
  function tryPush(
    type: PredictiveAlertType,
    priority: PredictiveAlertPriority,
    triggerSummary: string,
    recommendedAction: string
  ) {
    const key = `${customer.id}:${type}`;
    const existing = predictiveCooldownMap.get(key);
    if (existing && existing > new Date(now)) return; // within cooldown

    const cooldownMs = priority === 'high' ? PREDICTIVE_COOLDOWN_HIGH_MS : PREDICTIVE_COOLDOWN_MEDIUM_MS;
    const cooldownUntil = new Date(now + cooldownMs);
    predictiveCooldownMap.set(key, cooldownUntil);

    alerts.push({
      id: `${key}-${now}`,
      customerId: customer.id,
      priority,
      type,
      triggerSummary,
      recommendedAction,
      triggeredAt: new Date(now),
      cooldownUntil,
      urgencyScore: calcUrgencyScore(priority, arr),
    });
  }

  // Rule 1 — payment_risk
  if (
    customer.payment.daysSinceLastPayment > ALERT_PAYMENT_OVERDUE_DAYS ||
    scoreDropDays7 > ALERT_SCORE_DROP_THRESHOLD
  ) {
    const reason =
      customer.payment.daysSinceLastPayment > ALERT_PAYMENT_OVERDUE_DAYS
        ? `Payment ${customer.payment.daysSinceLastPayment} days overdue.`
        : `Health score dropped ${scoreDropDays7} pts in 7 days.`;
    tryPush('payment_risk', 'high', reason, 'Contact the customer immediately to resolve payment issues.');
  }

  // Rule 2 — engagement_cliff
  if (
    history?.previousLoginFrequencyPerWeek !== undefined &&
    history.previousLoginFrequencyPerWeek > 0 &&
    customer.engagement.loginFrequencyPerWeek <
      history.previousLoginFrequencyPerWeek * (1 - ALERT_LOGIN_DROP_PERCENT)
  ) {
    tryPush(
      'engagement_cliff',
      'high',
      `Login frequency dropped >50% vs. 30-day average (${customer.engagement.loginFrequencyPerWeek} vs ${history.previousLoginFrequencyPerWeek}/wk).`,
      'Reach out to understand blockers and offer onboarding support.'
    );
  }

  // Rule 3 — contract_expiry
  if (
    customer.contract.daysUntilRenewal < ALERT_CONTRACT_EXPIRY_DAYS &&
    customer.healthScore < ALERT_CONTRACT_LOW_SCORE
  ) {
    tryPush(
      'contract_expiry',
      'high',
      `Contract expires in ${customer.contract.daysUntilRenewal} days with health score ${customer.healthScore}.`,
      'Initiate renewal conversation and offer retention incentives.'
    );
  }

  // Rule 4 — support_spike
  const recentTickets = history?.recentSupportTicketCount ?? customer.engagement.openSupportTickets;
  if (recentTickets > ALERT_SUPPORT_TICKETS_THRESHOLD || (customer.engagement.escalationCount ?? 0) > 0) {
    tryPush(
      'support_spike',
      'medium',
      `${recentTickets} support tickets in last 7 days${(customer.engagement.escalationCount ?? 0) > 0 ? ' with escalations' : ''}.`,
      'Assign dedicated support contact and fast-track open tickets.'
    );
  }

  // Rule 5 — feature_stall
  if (
    history?.isGrowingAccount &&
    history.daysSinceLastFeatureUsage !== undefined &&
    history.daysSinceLastFeatureUsage > ALERT_FEATURE_STALL_DAYS
  ) {
    tryPush(
      'feature_stall',
      'medium',
      `No new feature usage in ${history.daysSinceLastFeatureUsage} days for a growing account.`,
      'Schedule a product walkthrough to highlight unused high-value features.'
    );
  }

  // Sort: high before medium; within same priority, higher urgencyScore first
  return alerts.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return b.urgencyScore - a.urgencyScore;
  });
}
