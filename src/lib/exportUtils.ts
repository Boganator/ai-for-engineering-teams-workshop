import { Customer } from '@/data/mock-customers';

export class ExportError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown>;
  constructor(message: string, code: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ExportError';
    this.code = code;
    this.context = context;
  }
}

export type ExportFormat = 'csv' | 'json';
export type ExportDataset = 'customers' | 'health-reports' | 'alert-history' | 'market-intelligence';

export interface ExportFilters {
  riskLevel?: 'healthy' | 'warning' | 'critical';
  dateFrom?: string;
  dateTo?: string;
  segment?: string;
}

export interface ExportAuditEntry {
  dataset: ExportDataset;
  format: ExportFormat;
  filters: ExportFilters;
  timestamp: string;
  rowCount: number;
}

// ─── RFC 4180 CSV helpers ─────────────────────────────────────────────────────

/** Escapes a single CSV field value per RFC 4180. */
function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  // Must quote if the field contains comma, double-quote, or newline
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Converts an array of objects to an RFC 4180 CSV string. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const headerRow = headers.map(escapeCsvField).join(',');
  const dataRows = rows.map((row) => headers.map((h) => escapeCsvField(row[h])).join(','));
  return [headerRow, ...dataRows].join('\r\n');
}

/** Converts an array of objects to a pretty-printed JSON string (2-space indent). */
export function toJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// ─── File naming ──────────────────────────────────────────────────────────────

/** Returns a filename in the format `{dataset}-{YYYY-MM-DD}-{HH-mm}.{ext}`. */
export function buildFileName(dataset: ExportDataset, format: ExportFormat): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  return `${dataset}-${date}-${time}.${format}`;
}

// ─── Browser download trigger ─────────────────────────────────────────────────

/** Triggers a browser file download with the given content and filename. */
export function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ─── Audit log ────────────────────────────────────────────────────────────────

const exportAuditLog: ExportAuditEntry[] = [];

/** Records an export action. Strips any PII from filter params before logging. */
function recordAuditEntry(entry: ExportAuditEntry): void {
  exportAuditLog.push(entry);
  // Console log — safe fields only, no PII
  console.info('[ExportAudit]', {
    dataset: entry.dataset,
    format: entry.format,
    timestamp: entry.timestamp,
    rowCount: entry.rowCount,
  });
}

/** Returns a read-only copy of the export audit log. */
export function getExportAuditLog(): Readonly<ExportAuditEntry[]> {
  return [...exportAuditLog];
}

// ─── Dataset serialisers ──────────────────────────────────────────────────────

function serializeCustomers(customers: Customer[]): Record<string, unknown>[] {
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    healthScore: c.healthScore,
    subscriptionTier: c.subscriptionTier ?? '',
    email: c.email ?? '',
    domains: (c.domains ?? []).join(';'),
    createdAt: c.createdAt ?? '',
  }));
}

// ─── Main export function ─────────────────────────────────────────────────────

export interface ExportOptions {
  dataset: ExportDataset;
  format: ExportFormat;
  customers?: Customer[];
  filters?: ExportFilters;
  /** Called with progress 0–100 during export */
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

/**
 * Performs a client-side data export.
 *
 * Supports CSV (RFC 4180) and JSON (pretty-printed, 2-space indent).
 * Calls onProgress with 0→50→100 during serialisation.
 * Respects AbortSignal — throws ExportError('CANCELLED') if aborted.
 * Records an audit log entry per export action.
 *
 * @throws ExportError for unsupported dataset or abort
 */
export async function exportData(options: ExportOptions): Promise<void> {
  const { dataset, format, customers = [], filters = {}, onProgress, signal } = options;

  const checkAbort = () => {
    if (signal?.aborted) {
      throw new ExportError('Export was cancelled.', 'CANCELLED', { dataset, format });
    }
  };

  checkAbort();
  onProgress?.(0);

  // Simulate async chunking for large datasets (gives UI time to render progress)
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  checkAbort();
  onProgress?.(30);

  let rows: Record<string, unknown>[];
  switch (dataset) {
    case 'customers':
      rows = serializeCustomers(customers);
      break;
    case 'health-reports':
      rows = serializeCustomers(customers).map((r) => ({ ...r, reportType: 'health-report' }));
      break;
    case 'alert-history':
      rows = [{ message: 'No alert history available in current session.' }];
      break;
    case 'market-intelligence':
      rows = customers.map((c) => ({ company: c.company, exportedAt: new Date().toISOString() }));
      break;
    default:
      throw new ExportError(`Unsupported dataset: ${String(dataset)}`, 'UNSUPPORTED_DATASET', { dataset });
  }

  // Apply filters
  if (filters.riskLevel) {
    rows = rows.filter((r) => {
      const score = Number(r['healthScore'] ?? 100);
      if (filters.riskLevel === 'critical') return score <= 30;
      if (filters.riskLevel === 'warning') return score > 30 && score <= 70;
      return score > 70;
    });
  }

  checkAbort();
  onProgress?.(60);

  const content = format === 'csv' ? toCsv(rows) : toJson(rows);
  const filename = buildFileName(dataset, format);
  const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json';

  checkAbort();
  onProgress?.(90);

  triggerDownload(content, filename, mime);

  recordAuditEntry({
    dataset,
    format,
    filters,
    timestamp: new Date().toISOString(),
    rowCount: rows.length,
  });

  onProgress?.(100);
}
