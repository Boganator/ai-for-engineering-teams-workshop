'use client';

import { useState, useMemo } from 'react';
import { Customer } from '@/data/mock-customers';
import {
  calculateHealthScore,
  evaluateAlerts,
  CustomerHealthInput,
  HealthScoreResult,
  RiskLevel,
  Alert,
} from '@/lib/alerts';

export interface CustomerHealthMonitoringProps {
  customer: Customer | null;
  /** Optional pre-built health input; if omitted, synthesised from customer.healthScore */
  healthInput?: CustomerHealthInput;
}

// ─── Color tokens (matching dashboard system: green / yellow / red) ───────────

const riskColors: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  healthy:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  warning:  { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  critical: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
};

const riskLabel: Record<RiskLevel, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  critical: 'Critical',
};

const factorLabels: Record<keyof HealthScoreResult['breakdown'], string> = {
  payment:    'Payment History',
  engagement: 'Engagement',
  contract:   'Contract Status',
  support:    'Support Satisfaction',
};

const factorWeights: Record<keyof HealthScoreResult['breakdown'], string> = {
  payment:    '40%',
  engagement: '30%',
  contract:   '20%',
  support:    '10%',
};

const priorityColors = {
  high:   { bg: 'bg-red-100',    text: 'text-red-700' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

/** Synthesises a CustomerHealthInput from a Customer's scalar healthScore. */
function deriveInput(customer: Customer): CustomerHealthInput {
  const s = customer.healthScore;
  return {
    payment: {
      daysSinceLastPayment: Math.round((1 - s / 100) * 80),
      avgPaymentDelayDays:  Math.round((1 - s / 100) * 40),
      overdueAmountUsd:     Math.round((1 - s / 100) * 6000),
    },
    engagement: {
      loginFrequencyPerWeek: Math.round((s / 100) * 6),
      featureUsageCount:     Math.round((s / 100) * 15),
      openSupportTickets:    Math.round((1 - s / 100) * 6),
    },
    contract: {
      daysUntilRenewal: Math.round((s / 100) * 300),
      contractValueUsd: Math.round((s / 100) * 80000),
      recentUpgrades:   s >= 80 ? 1 : 0,
    },
    support: {
      avgResolutionTimeDays: Math.round((1 - s / 100) * 10),
      satisfactionScore:     Math.round((s / 100) * 10),
      escalationCount:       Math.round((1 - s / 100) * 3),
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomerHealthMonitoring({
  customer,
  healthInput,
}: CustomerHealthMonitoringProps) {
  const [breakdownExpanded, setBreakdownExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const result = useMemo<HealthScoreResult | null>(() => {
    if (!customer) return null;
    try {
      setError(null);
      const input = healthInput ?? deriveInput(customer);
      return calculateHealthScore(input);
    } catch {
      setError('Unable to compute health score. Please try again.');
      return null;
    }
  }, [customer, healthInput]);

  const alerts = useMemo<Alert[]>(() => {
    if (!customer || !result) return [];
    try {
      const input = healthInput ?? deriveInput(customer);
      return evaluateAlerts(customer.id, input, result);
    } catch {
      return [];
    }
  }, [customer, result, healthInput]);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  function dismiss(id: string) {
    setDismissedIds((prev) => new Set([...prev, id]));
  }

  // ── Empty state ──
  if (!customer) {
    return (
      <div className="max-w-[480px] rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        Select a customer to view health monitoring.
      </div>
    );
  }

  // ── Loading (result not yet computed) ──
  if (!result && !error) {
    return (
      <div className="max-w-[480px] rounded-lg border border-gray-200 bg-white p-6 space-y-3">
        <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-48 rounded bg-gray-100 animate-pulse" />
        <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
      </div>
    );
  }

  // ── Error state ──
  if (error || !result) {
    return (
      <div className="max-w-[480px] rounded-lg border border-red-200 bg-red-50 p-6 space-y-3">
        <p className="text-sm text-red-700">{error ?? 'An unexpected error occurred.'}</p>
        <button
          type="button"
          onClick={() => setError(null)}
          className="text-xs font-medium text-red-700 underline hover:no-underline focus:outline-none"
        >
          Retry
        </button>
      </div>
    );
  }

  const { bg, text, border } = riskColors[result.riskLevel];

  return (
    <div className={`max-w-[480px] rounded-lg border ${border} ${bg} p-6 space-y-5`}>
      {/* ── Score badge ── */}
      <div className="flex items-center gap-4">
        <span className={`text-5xl font-bold ${text}`} aria-label={`Health score ${result.score}`}>
          {result.score}
        </span>
        <div>
          <p className={`text-lg font-semibold ${text}`}>{riskLabel[result.riskLevel]}</p>
          <p className="text-xs text-gray-500">Health Score</p>
        </div>
      </div>

      {/* ── Factor breakdown (collapsible) ── */}
      <section>
        <button
          type="button"
          aria-expanded={breakdownExpanded}
          aria-controls="factor-breakdown"
          onClick={() => setBreakdownExpanded((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' && setBreakdownExpanded((v) => !v)}
          className={`text-sm font-medium ${text} hover:underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-1`}
        >
          {breakdownExpanded ? 'Hide' : 'Show'} factor breakdown
        </button>

        {breakdownExpanded && (
          <ul id="factor-breakdown" className="mt-3 space-y-2" role="list">
            {(Object.keys(factorLabels) as Array<keyof HealthScoreResult['breakdown']>).map((key) => (
              <li key={key} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {factorLabels[key]}
                  <span className="ml-1 text-xs text-gray-400">({factorWeights[key]})</span>
                </span>
                <span className={`font-semibold ${text}`}>{Math.round(result.breakdown[key])}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Alerts panel ── */}
      {visibleAlerts.length > 0 && (
        <section aria-label="Active alerts">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Active Alerts ({visibleAlerts.length})
          </h3>
          <ul className="space-y-2" role="list">
            {visibleAlerts.map((alert) => {
              const { bg: aBg, text: aText } = priorityColors[alert.priority];
              return (
                <li key={alert.id} className={`rounded-md p-3 ${aBg} space-y-1`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wide ${aText}`}>
                        {alert.priority}
                      </span>
                      <span className={`text-xs font-medium ${aText}`}>{alert.type.replace(/_/g, ' ')}</span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Dismiss ${alert.type} alert`}
                      onClick={() => dismiss(alert.id)}
                      className={`text-xs ${aText} hover:opacity-70 focus:outline-none focus:ring-1 focus:ring-current rounded`}
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className={`text-xs ${aText}`}>{alert.message}</p>
                  <p className="text-xs text-gray-600 italic">{alert.recommendedAction}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
