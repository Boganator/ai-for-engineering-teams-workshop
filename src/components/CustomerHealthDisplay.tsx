'use client';

import { useState, useMemo } from 'react';
import { Customer } from '@/data/mock-customers';
import {
  calculateHealthScore,
  HealthScoreInput,
  HealthScoreResult,
  RiskLevel,
} from '@/lib/healthCalculator';

export interface CustomerHealthDisplayProps {
  customer: Customer | null;
  /** Optional pre-computed input data; if omitted, a synthetic input is derived from the customer's healthScore */
  healthInput?: HealthScoreInput;
}

// ─── Color maps (thresholds: 0–30 critical, 31–70 warning, 71–100 healthy) ───

const riskColors: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  healthy: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

const riskLabel: Record<RiskLevel, string> = {
  critical: 'Critical',
  warning: 'Warning',
  healthy: 'Healthy',
};

const factorLabels: Record<keyof HealthScoreResult['breakdown'], string> = {
  payment: 'Payment History',
  engagement: 'Engagement',
  contract: 'Contract Status',
  support: 'Support Satisfaction',
};

const factorWeights: Record<keyof HealthScoreResult['breakdown'], string> = {
  payment: '40%',
  engagement: '30%',
  contract: '20%',
  support: '10%',
};

/** Derives a synthetic HealthScoreInput from a Customer's raw healthScore for demo purposes. */
function deriveInputFromCustomer(customer: Customer): HealthScoreInput {
  const s = customer.healthScore;
  return {
    payment: {
      daysSinceLastPayment: Math.round((1 - s / 100) * 60),
      averagePaymentDelayDays: Math.round((1 - s / 100) * 30),
      overdueAmount: Math.round((1 - s / 100) * 5000),
    },
    engagement: {
      loginsPerMonth: Math.round((s / 100) * 25),
      featureUsageCount: Math.round((s / 100) * 15),
      openSupportTickets: Math.round((1 - s / 100) * 5),
    },
    contract: {
      daysUntilRenewal: Math.round((s / 100) * 300),
      contractValue: Math.round((s / 100) * 80000),
      recentUpgrade: s >= 80,
    },
    support: {
      averageResolutionTimeHours: Math.round((1 - s / 100) * 48),
      averageSatisfactionScore: Math.max(1, Math.round((s / 100) * 5)),
      escalationCount: Math.round((1 - s / 100) * 3),
    },
  };
}

export default function CustomerHealthDisplay({
  customer,
  healthInput,
}: CustomerHealthDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  const result = useMemo<HealthScoreResult | null>(() => {
    if (!customer) return null;
    const input = healthInput ?? deriveInputFromCustomer(customer);
    return calculateHealthScore(input);
  }, [customer, healthInput]);

  const [error] = useState<string | null>(null);

  if (!customer) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        Select a customer to view health score.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Unable to compute health score. Please try again.
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 flex items-center justify-center gap-2 text-sm text-gray-500">
        <svg
          aria-hidden="true"
          className="w-4 h-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Computing score…
      </div>
    );
  }

  const { bg, text, border } = riskColors[result.riskLevel];

  return (
    <div className={`rounded-lg border ${border} ${bg} p-6 space-y-4`}>
      {/* Score + label */}
      <div className="flex items-center gap-4">
        <span className={`text-5xl font-bold ${text}`}>{result.score}</span>
        <div className="flex flex-col">
          <span className={`text-lg font-semibold ${text}`}>{riskLabel[result.riskLevel]}</span>
          <span className="text-xs text-gray-500">Health Score</span>
        </div>
      </div>

      {/* Expandable breakdown */}
      <div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className={`text-sm font-medium ${text} underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current`}
        >
          {expanded ? 'Hide' : 'Show'} factor breakdown
        </button>

        {expanded && (
          <ul className="mt-3 space-y-2">
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
      </div>
    </div>
  );
}
