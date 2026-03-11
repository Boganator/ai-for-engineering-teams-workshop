export interface SentimentResult {
  score: number;       // -1 to 1, normalized
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;  // 0 to 1
}

export interface Headline {
  title: string;
  source: string;
  publishedAt: string; // ISO 8601
}

export interface MarketIntelligenceResponse {
  company: string;
  sentiment: SentimentResult;
  articleCount: number;
  headlines: Headline[];  // max 3
  lastUpdated: string;    // ISO 8601
}

export interface MarketIntelligenceErrorResponse {
  error: string;  // user-safe message
  code: string;   // e.g. 'INVALID_COMPANY', 'SERVICE_ERROR'
}
