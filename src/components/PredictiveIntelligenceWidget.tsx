'use client';

import { useState, useEffect, useMemo } from 'react';
import { Customer } from '@/data/mock-customers';
import {
  evaluatePredictiveAlerts,
  PredictiveAlert,
  PredictiveAlertType,
  CustomerData,
  CustomerHistory,
} from '@/lib/alerts';

export interface PredictiveIntelligenceWidgetProps {
  customer: Customer | null;
  history?: CustomerHistory;
}

// ─── Market intelligence types (mirroring API response) ───────────────────────

interface MarketHeadline {
  title: string;
  source: string;
  publishedAt: string; // ISO 8601 from API
}

interface MarketData {
  sentiment: 'positive' | 'neutral' | 'negative';
  articleCount: number;
  headlines: MarketHeadline[];
  lastUpdated: string;
}

// ─── Color tokens matching dashboard system (#22c55e / #eab308 / #ef4444) ─────
const sentimentColors = {
  positive: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  neutral:  { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  negative: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' },
} as const;

const priorityBadge = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
} as const;

const alertTypeLabels: Record<PredictiveAlertType, string> = {
  payment_risk:     'Payment Risk',
  engagement_cliff: 'Engagement Cliff',
  contract_expiry:  'Contract Expiry',
  support_spike:    'Support Spike',
  feature_stall:    'Feature Stall',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Derives CustomerData from the dashboard's Customer object. */
function toCustomerData(customer: Customer): CustomerData {
  const s = customer.healthScore;
  return {
    id: customer.id,
    company: customer.company,
    healthScore: s,
    annualRecurringRevenue:
      customer.subscriptionTier === 'enterprise' ? 200_000
      : customer.subscriptionTier === 'premium'  ? 60_000
      : 15_000,
    payment: {
      daysSinceLastPayment: Math.round((1 - s / 100) * 80),
      overdueAmountUsd:     Math.round((1 - s / 100) * 6000),
    },
    engagement: {
      loginFrequencyPerWeek: Math.round((s / 100) * 6),
      openSupportTickets:    Math.round((1 - s / 100) * 6),
      escalationCount:       Math.round((1 - s / 100) * 2),
    },
    contract: {
      daysUntilRenewal: Math.round((s / 100) * 300),
    },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-4 rounded bg-gray-200 ${i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
      ))}
    </div>
  );
}

function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 space-y-1">
      <p className="text-xs text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs font-medium text-red-700 underline hover:no-underline focus:outline-none"
      >
        Retry
      </button>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export default function PredictiveIntelligenceWidget({
  customer,
  history,
}: PredictiveIntelligenceWidgetProps) {
  // ── Alerts state ──
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertRetryKey, setAlertRetryKey] = useState(0);

  // ── Market state ──
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [marketRetryKey, setMarketRetryKey] = useState(0);

  // ── Compute alerts (synchronous, memoised) ──
  const alerts = useMemo<PredictiveAlert[]>(() => {
    if (!customer) return [];
    try {
      setAlertError(null);
      return evaluatePredictiveAlerts(toCustomerData(customer), history);
    } catch {
      setAlertError('Unable to evaluate alerts. Please retry.');
      return [];
    }
  // alertRetryKey intentionally triggers re-computation on retry
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, history, alertRetryKey]);

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  // ── Fetch market intelligence via API route ──
  useEffect(() => {
    if (!customer) {
      setMarketData(null);
      setMarketError(null);
      return;
    }

    let cancelled = false;
    setMarketLoading(true);
    setMarketError(null);
    setMarketData(null);

    fetch(`/api/market-intelligence/${encodeURIComponent(customer.company)}`)
      .then(async (res) => {
        const json = await res.json() as MarketData & { error?: string };
        if (!res.ok) throw new Error(json?.error ?? 'Failed to load market data.');
        return json as MarketData;
      })
      .then((result) => {
        if (!cancelled) { setMarketData(result); setMarketLoading(false); }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMarketError(err instanceof Error ? err.message : 'Market data unavailable.');
          setMarketLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [customer, marketRetryKey]);

  // ── Empty state ──
  if (!customer) {
    return (
      <div className="max-w-[560px] bg-white rounded-lg shadow p-6 text-sm text-gray-500 text-center">
        Select a customer to view predictive intelligence.
      </div>
    );
  }

  const bothLoading = marketLoading && alerts.length === 0 && !alertError;

  return (
    <div className="max-w-[560px] bg-white rounded-lg shadow p-6 space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Predictive Intelligence</h2>

      {/* Combined loading skeleton shown while both panels are pending */}
      {bothLoading ? (
        <div className="space-y-4" aria-label="Loading predictive intelligence" aria-busy="true">
          <PanelSkeleton lines={4} />
          <PanelSkeleton lines={3} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ── Active Alerts panel ── */}
          <section aria-label="Active alerts">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Active Alerts</h3>

            {alertError ? (
              <PanelError
                message={alertError}
                onRetry={() => setAlertRetryKey((k) => k + 1)}
              />
            ) : visibleAlerts.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No active alerts.</p>
            ) : (
              <ul
                className="space-y-2 max-h-[320px] overflow-y-auto pr-1"
                role="list"
                aria-label={`${visibleAlerts.length} active alerts`}
              >
                {visibleAlerts.map((alert) => (
                  <li key={alert.id} className="rounded border border-gray-100 bg-gray-50 p-2.5 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold uppercase tracking-wide rounded px-1.5 py-0.5 ${priorityBadge[alert.priority]}`}>
                          {alert.priority}
                        </span>
                        <span className="text-xs font-medium text-gray-700">
                          {alertTypeLabels[alert.type]}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Dismiss ${alertTypeLabels[alert.type]} alert`}
                        onClick={() => setDismissedIds((prev) => new Set([...prev, alert.id]))}
                        className="text-xs text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300 rounded shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">{alert.triggerSummary}</p>
                    <p className="text-xs text-gray-500 italic">{alert.recommendedAction}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Market Signals panel ── */}
          <section aria-label="Market signals">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Market Signals
              <span className="ml-1 text-xs font-normal text-gray-400">— {customer.company}</span>
            </h3>

            {marketLoading ? (
              <PanelSkeleton lines={4} />
            ) : marketError ? (
              <PanelError
                message={marketError}
                onRetry={() => setMarketRetryKey((k) => k + 1)}
              />
            ) : marketData ? (
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full ${sentimentColors[marketData.sentiment].bg}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${sentimentColors[marketData.sentiment].dot}`} aria-hidden="true" />
                  <span className={`text-xs font-medium capitalize ${sentimentColors[marketData.sentiment].text}`}>
                    {marketData.sentiment}
                  </span>
                </div>

                <div className="flex gap-3 text-xs text-gray-400">
                  <span>{marketData.articleCount} articles</span>
                  <span>Updated {formatDate(marketData.lastUpdated)}</span>
                </div>

                <ul className="space-y-2">
                  {marketData.headlines.slice(0, 3).map((h, i) => (
                    <li key={i} className="border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                      <p className="text-xs font-medium text-gray-800 leading-snug">{h.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{h.source} · {formatDate(h.publishedAt)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
