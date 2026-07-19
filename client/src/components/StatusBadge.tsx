import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: 'نشط', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' },
  completed: { label: 'مكتمل', className: 'bg-green-100 text-green-700 dark:bg-green-900/40' },
  on_hold: { label: 'معلق', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40' },
  cancelled: { label: 'ملغى', className: 'bg-red-100 text-red-700 dark:bg-red-900/40' },
  planning: { label: 'تخطيط', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800' },
  in_progress: { label: 'قيد التنفيذ', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' },
  pending: { label: 'قيد الانتظار', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800' },
  draft: { label: 'مسودة', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800' },
  to_read: { label: 'للقراءة', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40' },
  reading: { label: 'يُقرأ', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' },
  abandoned: { label: 'متوقف', className: 'bg-red-100 text-red-700 dark:bg-red-900/40' },
};

export default function StatusBadge({ status, className }: { status: string; className?: string }) {
  const def = STATUS_MAP[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  return <span className={cn('text-[10px] px-2 py-0.5 rounded-full', def.className, className)}>{def.label}</span>;
}
