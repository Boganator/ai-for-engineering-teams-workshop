'use client';

import { useEffect, useState } from 'react';
import { MarketIntelligenceResponse, SentimentResult } from '@/lib/marketIntelligenceTypes';

export interface MarketIntelligenceWidgetProps {
  company: string | null;
}

// ─── Color mapping ────────────────────────────────────────────────────────────

const sentimentColors: Record<SentimentResult['label'], { bg: string; text: string; dot: string }> = {
  positive: { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500' },
  neutral:  { bg: 'bg-yellow-100', text: 'text-yellow-600', dot: 'bg-yellow-400' },
  negative: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' },
};

const sentimentLabel: Record<SentimentResult['label'], string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarketIntelligenceWidget({ company }: MarketIntelligenceWidgetProps) {
  const [data, setData] = useState<MarketIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/market-intelligence/${encodeURIComponent(company)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error ?? 'Failed to load market data.');
        }
        return json as MarketIntelligenceResponse;
      })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load market intelligence.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [company]);

  if (!company) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500 text-center">
        Select a customer to view market intelligence.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center gap-2 text-sm text-gray-500">
        <svg aria-hidden="true" className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Loading market intelligence…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { bg, text, dot } = sentimentColors[data.sentiment.label];

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Market Intelligence</h3>

      {/* Sentiment badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${bg}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
        <span className={`text-sm font-medium ${text}`}>
          {sentimentLabel[data.sentiment.label]}
        </span>
        <span className={`text-xs ${text} opacity-80`}>
          {Math.round(data.sentiment.confidence * 100)}% confidence
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{data.articleCount} articles</span>
        <span>Updated {formatDate(data.lastUpdated)}</span>
      </div>

      {/* Headlines */}
      <ul className="space-y-3">
        {data.headlines.slice(0, 3).map((headline, i) => (
          <li key={i} className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
            <p className="text-sm font-medium text-gray-800 leading-snug">{headline.title}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {headline.source} · {formatDate(headline.publishedAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
