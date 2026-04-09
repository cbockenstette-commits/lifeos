import type { Task } from '@lifeos/shared';

// Gapped-integer sort_order math (ADR-5). Pure functions used by the
// Kanban board when computing the new sort_order for a dropped task.
//
// Strategy: insert a task between two existing tasks by taking the
// midpoint of their sort_orders. When the gap shrinks below 2, the
// column should be rebalanced — in v1 we just note it. Single-user
// hand-dragging won't exhaust the 1000-per-step gap in practice.

export const SORT_STEP = 1000;

/**
 * Compute the sort_order for a task inserted at `index` in `columnTasks`.
 * columnTasks MUST be sorted ascending by sort_order and MUST NOT include
 * the task being moved (caller should pre-filter it out).
 */
export function computeInsertSortOrder(
  columnTasks: Pick<Task, 'sort_order'>[],
  index: number,
): number {
  if (columnTasks.length === 0) return SORT_STEP;
  if (index <= 0) {
    const first = columnTasks[0]!.sort_order;
    return Math.floor(first / 2);
  }
  if (index >= columnTasks.length) {
    const last = columnTasks[columnTasks.length - 1]!.sort_order;
    return last + SORT_STEP;
  }
  const prev = columnTasks[index - 1]!.sort_order;
  const next = columnTasks[index]!.sort_order;
  return Math.floor((prev + next) / 2);
}
