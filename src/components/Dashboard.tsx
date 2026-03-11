'use client';

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  memo,
  lazy,
  Suspense,
} from 'react';
import { Customer, mockCustomers } from '@/data/mock-customers';
import DashboardErrorBoundary from '@/components/DashboardErrorBoundary';
import WidgetErrorBoundary from '@/components/WidgetErrorBoundary';
import CustomerSelector from '@/components/CustomerSelector';
import CustomerHealthMonitoring from '@/components/CustomerHealthMonitoring';
import DomainHealthWidget from '@/components/DomainHealthWidget';
import { exportData, ExportFormat, ExportDataset } from '@/lib/exportUtils';

// ─── Lazy-loaded below-the-fold widgets ──────────────────────────────────────
const MarketIntelligenceWidget = lazy(() => import('@/components/MarketIntelligenceWidget'));

// ─── Export error class ───────────────────────────────────────────────────────
export { ExportError } from '@/lib/exportUtils';

// ─── Props ────────────────────────────────────────────────────────────────────
export interface DashboardProps {
  initialCustomers?: Customer[];
}

// ─── Simple virtual list (no external dep) ───────────────────────────────────
const ITEM_HEIGHT = 120; // px — approximate CustomerCard height
const OVERSCAN = 3;

interface VirtualListProps {
  items: Customer[];
  selectedId: string | null;
  onSelect: (customer: Customer) => void;
  containerHeight: number;
}

const VirtualCustomerList = memo(function VirtualCustomerList({
  items,
  selectedId,
  onSelect,
  containerHeight,
}: VirtualListProps) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const visibleEnd = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN
  );
  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * ITEM_HEIGHT;

  return (
    <div
      style={{ height: containerHeight, overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      role="list"
      aria-label="Customer list"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((customer, i) => {
          const absoluteIndex = visibleStart + i;
          return (
            <div
              key={customer.id}
              style={{ position: 'absolute', top: absoluteIndex * ITEM_HEIGHT, width: '100%' }}
              role="listitem"
            >
              <div className="px-1 py-1">
                <div
                  className={`p-3 bg-white rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                    selectedId === customer.id ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'
                  }`}
                  onClick={() => onSelect(customer)}
                  onKeyDown={(e) => e.key === 'Enter' && onSelect(customer)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedId === customer.id}
                  aria-label={`Select ${customer.name} from ${customer.company}`}
                >
                  <p className="font-semibold text-gray-900 text-sm truncate">{customer.name}</p>
                  <p className="text-xs text-gray-500 truncate">{customer.company}</p>
                  <p className="text-xs text-gray-400">Score: {customer.healthScore}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function WidgetSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3 animate-pulse" aria-busy="true" aria-label={`Loading ${label}`}>
      <div className="h-4 w-32 rounded bg-gray-200" />
      <div className="h-4 w-48 rounded bg-gray-100" />
      <div className="h-4 w-40 rounded bg-gray-100" />
    </div>
  );
}

// ─── Export panel ─────────────────────────────────────────────────────────────
interface ExportPanelProps {
  customers: Customer[];
}

const ExportPanel = memo(function ExportPanel({ customers }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dataset, setDataset] = useState<ExportDataset>('customers');
  const [progress, setProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleExport = useCallback(async () => {
    abortRef.current = new AbortController();
    setProgress(0);
    try {
      await exportData({
        dataset,
        format,
        customers,
        onProgress: setProgress,
        signal: abortRef.current.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('CANCELLED')) {
        // User cancelled — no-op
      } else {
        console.error('[ExportPanel] Export failed.');
      }
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  }, [dataset, format, customers]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const isExporting = progress !== null;

  return (
    <section aria-label="Export data" className="bg-white rounded-lg shadow p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Export Data</h3>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label htmlFor="export-dataset" className="text-xs text-gray-500 block mb-1">Dataset</label>
          <select
            id="export-dataset"
            value={dataset}
            onChange={(e) => setDataset(e.target.value as ExportDataset)}
            disabled={isExporting}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="customers">Customers</option>
            <option value="health-reports">Health Reports</option>
            <option value="alert-history">Alert History</option>
            <option value="market-intelligence">Market Intelligence</option>
          </select>
        </div>
        <div>
          <label htmlFor="export-format" className="text-xs text-gray-500 block mb-1">Format</label>
          <select
            id="export-format"
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            disabled={isExporting}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          Export
        </button>
        {isExporting && (
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
        )}
      </div>
      {isExporting && (
        <div aria-live="polite" aria-label={`Export progress: ${progress}%`}>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
        </div>
      )}
    </section>
  );
});

// ─── Dashboard orchestrator ───────────────────────────────────────────────────

export default function Dashboard({ initialCustomers = mockCustomers }: DashboardProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const handleSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setLiveAnnouncement(`Selected ${customer.name} from ${customer.company}.`);
  }, []);

  // Virtual list is only used for large datasets (>50 rows)
  const useVirtual = initialCustomers.length > 50;

  const customerSelectorNode = useMemo(() => {
    if (useVirtual) {
      return (
        <VirtualCustomerList
          items={initialCustomers}
          selectedId={selectedCustomer?.id ?? null}
          onSelect={handleSelect}
          containerHeight={400}
        />
      );
    }
    return (
      <CustomerSelector
        customers={initialCustomers}
        onSelect={handleSelect}
      />
    );
  }, [initialCustomers, selectedCustomer?.id, handleSelect, useVirtual]);

  return (
    <DashboardErrorBoundary>
      {/* Skip-to-main-content — first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Screen-reader live region for async updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm px-6 py-4" role="banner">
          <h1 className="text-2xl font-bold text-gray-900">Customer Intelligence Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI for Engineering Teams Workshop</p>
        </header>

        <main id="main-content" className="p-4 md:p-6 space-y-6" role="main">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer list */}
            <nav aria-label="Customer list" className="lg:col-span-1 bg-white rounded-lg shadow p-4 space-y-3">
              <h2 className="text-base font-semibold text-gray-900">Customers</h2>
              <WidgetErrorBoundary widgetName="CustomerSelector">
                {customerSelectorNode}
              </WidgetErrorBoundary>
            </nav>

            {/* Widgets grid */}
            <section aria-label="Customer widgets" className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Health monitoring */}
                <WidgetErrorBoundary widgetName="Health Monitoring">
                  <CustomerHealthMonitoring customer={selectedCustomer} />
                </WidgetErrorBoundary>

                {/* Domain health */}
                <WidgetErrorBoundary widgetName="Domain Health">
                  <DomainHealthWidget customer={selectedCustomer} />
                </WidgetErrorBoundary>

                {/* Market intelligence — lazy loaded */}
                <WidgetErrorBoundary widgetName="Market Intelligence">
                  <Suspense fallback={<WidgetSkeleton label="Market Intelligence" />}>
                    <MarketIntelligenceWidget company={selectedCustomer?.company ?? null} />
                  </Suspense>
                </WidgetErrorBoundary>
              </div>
            </section>
          </div>

          {/* Export panel */}
          <aside aria-label="Export tools">
            <WidgetErrorBoundary widgetName="Export">
              <ExportPanel customers={initialCustomers} />
            </WidgetErrorBoundary>
          </aside>
        </main>
      </div>
    </DashboardErrorBoundary>
  );
}
