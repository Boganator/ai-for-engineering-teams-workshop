import { generateMockMarketData, calculateMockSentiment } from '@/data/mock-market-intelligence';
import { MarketIntelligenceResponse } from '@/lib/marketIntelligenceTypes';

// ─── Constants ────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ─── Custom error ─────────────────────────────────────────────────────────────

export class MarketIntelligenceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'MarketIntelligenceError';
    this.code = code;
  }
}

// ─── Cache entry shape ────────────────────────────────────────────────────────

interface CacheEntry {
  data: MarketIntelligenceResponse;
  expiresAt: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class MarketIntelligenceService {
  private cache: Map<string, CacheEntry> = new Map();

  /**
   * Returns market intelligence for the given company name.
   * Results are cached per company for CACHE_TTL_MS (10 minutes).
   * Throws MarketIntelligenceError for invalid input or unexpected failures.
   */
  getMarketIntelligence(company: string): MarketIntelligenceResponse {
    if (!company || typeof company !== 'string') {
      throw new MarketIntelligenceError('Company name is required.', 'INVALID_COMPANY');
    }

    const cached = this.cache.get(company);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    try {
      const marketData = generateMockMarketData(company);
      const sentiment = calculateMockSentiment(marketData.headlines);

      const result: MarketIntelligenceResponse = {
        company,
        sentiment,
        articleCount: marketData.articleCount,
        headlines: marketData.headlines.slice(0, 3),
        lastUpdated: new Date().toISOString(),
      };

      this.cache.set(company, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    } catch {
      throw new MarketIntelligenceError(
        'Failed to retrieve market intelligence.',
        'SERVICE_ERROR'
      );
    }
  }
}

// Singleton for use in API routes (Next.js module cache)
export const marketIntelligenceService = new MarketIntelligenceService();
