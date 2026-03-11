export interface HealthIndicatorProps {
  healthScore: number; // 0–100
  size?: 'sm' | 'md' | 'lg'; // default: 'md'
}

type Tier = 'critical' | 'warning' | 'healthy';

function getTier(score: number): Tier {
  if (score <= 39) return 'critical';
  if (score <= 69) return 'warning';
  return 'healthy';
}

const tierConfig: Record<Tier, { label: string; dot: string; text: string; bg: string }> = {
  critical: {
    label: 'Critical',
    dot: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
  },
  warning: {
    label: 'At Risk',
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
  healthy: {
    label: 'Healthy',
    dot: 'bg-green-500',
    text: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
  },
};

const sizeConfig = {
  sm: { pill: 'px-1.5 py-0.5 gap-1 text-xs', dot: 'w-1.5 h-1.5' },
  md: { pill: 'px-2 py-1 gap-1.5 text-sm', dot: 'w-2 h-2' },
  lg: { pill: 'px-3 py-1.5 gap-2 text-base', dot: 'w-2.5 h-2.5' },
};

export default function HealthIndicator({ healthScore, size = 'md' }: HealthIndicatorProps) {
  const tier = getTier(healthScore);
  const { label, dot, text, bg } = tierConfig[tier];
  const { pill, dot: dotSize } = sizeConfig[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${bg} ${text} ${pill}`}
    >
      <span className={`rounded-full shrink-0 ${dot} ${dotSize}`} aria-hidden="true" />
      <span>{healthScore}</span>
      <span>{label}</span>
    </span>
  );
}
