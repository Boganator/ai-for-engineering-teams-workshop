import { Customer } from '@/data/mock-customers';

export interface DomainHealthWidgetProps {
  customer: Customer | null;
}

type DomainStatus = 'online' | 'degraded' | 'offline';

const statusOrder: DomainStatus[] = ['online', 'degraded', 'offline'];

function getDomainStatus(domain: string): DomainStatus {
  const sum = domain.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return statusOrder[sum % 3];
}

function worstStatus(statuses: DomainStatus[]): DomainStatus {
  if (statuses.includes('offline')) return 'offline';
  if (statuses.includes('degraded')) return 'degraded';
  return 'online';
}

const statusConfig: Record<DomainStatus, { dot: string; text: string; bg: string; border: string; label: string }> = {
  online:   { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-200', label: 'Online' },
  degraded: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-200', label: 'Degraded' },
  offline:  { dot: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50',    border: 'border-red-200',   label: 'Offline' },
};

export default function DomainHealthWidget({ customer }: DomainHealthWidgetProps) {
  if (!customer) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Domain Health</h3>
        <p className="text-sm text-gray-400">Select a customer to view domain health</p>
      </div>
    );
  }

  const domains = customer.domains && customer.domains.length > 0 ? customer.domains : null;

  if (!domains) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Domain Health</h3>
        <p className="text-xs text-gray-500 mb-2">{customer.name} · {customer.company}</p>
        <p className="text-sm text-gray-400">No domains registered</p>
      </div>
    );
  }

  const statuses = domains.map(getDomainStatus);
  const overall = worstStatus(statuses);
  const onlineCount = statuses.filter((s) => s === 'online').length;
  const overallConfig = statusConfig[overall];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-gray-700">Domain Health</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${overallConfig.bg} ${overallConfig.text} ${overallConfig.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${overallConfig.dot}`} aria-hidden="true" />
          {overallConfig.label}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-3">{customer.name} · {customer.company}</p>

      <ul className="flex flex-col gap-2 mb-3">
        {domains.map((domain, i) => {
          const status = statuses[i];
          const cfg = statusConfig[status];
          return (
            <li key={domain} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
                <span className="truncate text-gray-700">{domain}</span>
              </span>
              <span className={`shrink-0 text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-gray-400">
        {onlineCount}/{domains.length} domain{domains.length !== 1 ? 's' : ''} online
      </p>
    </div>
  );
}
