// ── Priority Labels & Colors ──────────────────────────────────────────────────
export const PRIORITY_CONFIG = {
  urgent: { label: "عاجلة", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  high: { label: "عالية", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  medium: { label: "متوسطة", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  low: { label: "منخفضة", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
} as const;

export const PRIORITY_WEIGHTS: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export type Priority = keyof typeof PRIORITY_CONFIG;

// ── Entity Status Labels & Colors ─────────────────────────────────────────────
export const TASK_STATUS_CONFIG = {
  pending: { label: "قيد الانتظار", className: "bg-slate-500/10 text-slate-400" },
  in_progress: { label: "قيد التنفيذ", className: "bg-blue-500/10 text-blue-500" },
  completed: { label: "مكتمل", className: "bg-green-500/10 text-green-500" },
  cancelled: { label: "ملغى", className: "bg-red-500/10 text-red-500" },
} as const;

export const GOAL_STATUS_CONFIG = {
  active: { label: "نشط", className: "bg-blue-500/10 text-blue-500" },
  completed: { label: "مكتمل", className: "bg-green-500/10 text-green-500" },
  on_hold: { label: "معلق", className: "bg-yellow-500/10 text-yellow-500" },
  cancelled: { label: "ملغى", className: "bg-red-500/10 text-red-500" },
} as const;

export const PROJECT_STATUS_CONFIG = {
  planning: { label: "تخطيط", className: "bg-slate-500/10 text-slate-400" },
  in_progress: { label: "قيد التنفيذ", className: "bg-blue-500/10 text-blue-500" },
  completed: { label: "مكتمل", className: "bg-green-500/10 text-green-500" },
  on_hold: { label: "معلق", className: "bg-yellow-500/10 text-yellow-500" },
  cancelled: { label: "ملغى", className: "bg-red-500/10 text-red-500" },
} as const;

export const BOOK_STATUS_CONFIG = {
  to_read: { label: "للقراءة", className: "bg-slate-500/10 text-slate-400" },
  reading: { label: "يُقرأ", className: "bg-blue-500/10 text-blue-500" },
  completed: { label: "منتهي", className: "bg-green-500/10 text-green-500" },
  abandoned: { label: "متوقف", className: "bg-red-500/10 text-red-500" },
} as const;

export const PLAN_STATUS_CONFIG = {
  draft: { label: "مسودة", className: "bg-slate-500/10 text-slate-400" },
  active: { label: "نشط", className: "bg-blue-500/10 text-blue-500" },
  completed: { label: "مكتمل", className: "bg-green-500/10 text-green-500" },
  cancelled: { label: "ملغى", className: "bg-red-500/10 text-red-500" },
} as const;

export type TaskStatus = keyof typeof TASK_STATUS_CONFIG;
export type GoalStatus = keyof typeof GOAL_STATUS_CONFIG;
export type ProjectStatus = keyof typeof PROJECT_STATUS_CONFIG;

export function getStatusConfig(status: string | undefined | null, type: "task" | "goal" | "project" | "book" | "plan" = "task") {
  const map = {
    task: TASK_STATUS_CONFIG,
    goal: GOAL_STATUS_CONFIG,
    project: PROJECT_STATUS_CONFIG,
    book: BOOK_STATUS_CONFIG,
    plan: PLAN_STATUS_CONFIG,
  }[type];
  return map?.[status as keyof typeof map] ?? { label: status ?? "غير معروف", className: "bg-slate-500/10 text-slate-400" };
}

// ── Habit Frequency ───────────────────────────────────────────────────────────
export const FREQUENCY_LABELS: Record<string, string> = {
  daily: "يومي",
  weekly: "أسبوعي",
  monthly: "شهري",
};

// ── Greeting ──────────────────────────────────────────────────────────────────
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "مساء الخير";
  return "مساء الخير";
}

// ── Sort helper ───────────────────────────────────────────────────────────────
export function sortByPriority<T extends { priority?: string | null }>(a: T, b: T): number {
  const wa = PRIORITY_WEIGHTS[a.priority || "medium"] ?? 2;
  const wb = PRIORITY_WEIGHTS[b.priority || "medium"] ?? 2;
  return wb - wa;
}
