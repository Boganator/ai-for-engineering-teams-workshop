import { NextRequest, NextResponse } from 'next/server';
import { marketIntelligenceService, MarketIntelligenceError } from '@/lib/MarketIntelligenceService';
import { MarketIntelligenceErrorResponse } from '@/lib/marketIntelligenceTypes';

// ─── Constants ────────────────────────────────────────────────────────────────
const SIMULATED_DELAY_MIN_MS = 200;
const SIMULATED_DELAY_MAX_MS = 500;

/** Validates the company path parameter. */
function validateCompany(company: string): string | null {
  if (!company || company.trim().length === 0) return 'Company name cannot be empty.';
  if (company.length > 100) return 'Company name must not exceed 100 characters.';
  if (!/^[a-zA-Z0-9 \-]+$/.test(company)) return 'Company name contains invalid characters.';
  return null;
}

function simulatedDelay(): Promise<void> {
  const ms = SIMULATED_DELAY_MIN_MS + Math.random() * (SIMULATED_DELAY_MAX_MS - SIMULATED_DELAY_MIN_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ company: string }> }
) {
  const { company } = await params;
  const decoded = decodeURIComponent(company);

  const validationError = validateCompany(decoded);
  if (validationError) {
    const body: MarketIntelligenceErrorResponse = { error: validationError, code: 'INVALID_COMPANY' };
    return NextResponse.json(body, { status: 400 });
  }

  await simulatedDelay();

  try {
    const data = marketIntelligenceService.getMarketIntelligence(decoded);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    if (err instanceof MarketIntelligenceError) {
      const body: MarketIntelligenceErrorResponse = { error: 'Unable to retrieve market data.', code: err.code };
      return NextResponse.json(body, { status: 503 });
    }
    const body: MarketIntelligenceErrorResponse = { error: 'An unexpected error occurred.', code: 'SERVICE_ERROR' };
    return NextResponse.json(body, { status: 500 });
  }
}
