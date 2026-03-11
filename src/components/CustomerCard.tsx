import { Customer } from '@/data/mock-customers';
import HealthIndicator from '@/components/HealthIndicator';

export interface CustomerCardProps {
  customer: Customer;
  onClick?: () => void;
}

export default function CustomerCard({ customer, onClick }: CustomerCardProps) {
  const { name, company, healthScore, domains } = customer;
  const hasDomains = domains && domains.length > 0;

  return (
    <div
      className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-sm text-gray-500 truncate">{company}</p>
        </div>
        <HealthIndicator healthScore={healthScore} size="sm" />
      </div>

      {hasDomains && (
        <div className="mt-2 flex flex-col gap-0.5">
          {domains.slice(0, 3).map((domain) => (
            <span key={domain} className="text-xs text-gray-400">{domain}</span>
          ))}
          {domains.length > 3 && (
            <span className="text-xs text-gray-400">+{domains.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  );
}
