import { cn } from '@/lib/utils';

const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  urgent: { label: 'عاجل', className: 'bg-red-100 text-red-700 dark:bg-red-900/40' },
  high: { label: 'عالي', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40' },
  medium: { label: 'متوسط', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' },
  low: { label: 'منخفض', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800' },
};

export default function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  if (priority === 'medium' || !PRIORITY_MAP[priority]) return null;
  const def = PRIORITY_MAP[priority];
  return <span className={cn('text-[9px] px-1.5 py-0.5 rounded', def.className, className)} aria-label={`الأولوية: ${def.label}`}>{def.label}</span>;
}
