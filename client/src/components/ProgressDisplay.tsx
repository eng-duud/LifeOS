import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const sizeConfig = {
  sm: { bar: 'h-1.5', text: 'text-xs' },
  md: { bar: 'h-2.5', text: 'text-xs' },
  lg: { bar: 'h-4', text: 'text-sm' },
};

const variant = (v: number) =>
  v >= 100 ? 'bg-green-500' : v >= 70 ? 'bg-emerald-500' : v >= 40 ? 'bg-blue-500' : 'bg-amber-500';

export default function ProgressDisplay({ value, size = 'md', showLabel = true, label, className }: ProgressProps) {
  const cfg = sizeConfig[size];
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className={cn('text-muted-foreground', cfg.text)}>{label}</span>}
          {showLabel && <span className={cn('font-mono', cfg.text)}>{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', cfg.bar)}>
        <div
          className={cn(cfg.bar, 'rounded-full transition-all duration-500', variant(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function CircularProgress({ value, size = 48 }: { value: number; size?: number }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-500"
        />
      </svg>
      <span className="absolute text-xs font-semibold font-mono">{clamped}%</span>
    </div>
  );
}
