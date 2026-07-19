import { useCallback } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Shared cache invalidation — invalidates all common entity + dashboard queries.
 */
export function useInvalidateAll() {
  const utils = trpc.useUtils();

  return useCallback(
    () => {
      utils.tasks.list.invalidate();
      utils.goals.list.invalidate();
      utils.projects.list.invalidate();
      utils.habits.list.invalidate();
      utils.books.list.invalidate();
      utils.plans.list.invalidate();
      utils.lifeAreas.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.healthStatus.invalidate();
    },
    [
      utils.tasks.list,
      utils.goals.list,
      utils.projects.list,
      utils.habits.list,
      utils.books.list,
      utils.plans.list,
      utils.lifeAreas.list,
      utils.dashboard.stats,
      utils.dashboard.healthStatus,
    ]
  );
}
