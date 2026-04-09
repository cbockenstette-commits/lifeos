import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client.js';
import { queryKeys } from '../lib/query-keys.js';
import { invalidateDashboard } from '../api/mutations.js';
import type { Task, TaskStatus } from '@lifeos/shared';

// Optimistic Kanban move mutation.
//
// Takes a task id, its new status, its new sort_order, and optionally a
// new sprint_id. Patches the cache immediately so drag-and-drop feels
// instant, rolls back on failure, and reconciles with the server on
// settled. The server is always the source of truth — if the canonical
// ordering differs from the optimistic guess, the invalidate-and-refetch
// on onSettled corrects it on the next render.

interface MovePayload {
  id: string;
  status: TaskStatus;
  sort_order: number;
  sprint_id?: string | null;
}

interface MoveContext {
  previousCaches: Map<readonly unknown[], unknown>;
}

export function useUpdateTaskPosition() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, MovePayload, MoveContext>({
    mutationFn: ({ id, ...body }) => api.patch<Task>(`/tasks/${id}`, body),

    onMutate: async ({ id, status, sort_order, sprint_id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all() });

      // Snapshot every cached task list so we can restore them on error.
      // We don't know which keys are live; grab all of them under the
      // `tasks` root.
      const previousCaches = new Map<readonly unknown[], unknown>();
      const allListQueries = queryClient.getQueriesData<Task[]>({
        queryKey: queryKeys.tasks.all(),
      });

      for (const [key, data] of allListQueries) {
        previousCaches.set(key, data);
        if (!Array.isArray(data)) continue;
        // Update the in-memory list: replace the moved task and re-sort.
        const updated = data.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                sort_order,
                sprint_id: sprint_id === undefined ? t.sprint_id : sprint_id,
              }
            : t,
        );
        // Re-sort by (status, sort_order) so the Kanban column order is
        // predictable in the optimistic state.
        updated.sort((a, b) => {
          if (a.status !== b.status) return a.status.localeCompare(b.status);
          return a.sort_order - b.sort_order;
        });
        queryClient.setQueryData(key, updated);
      }

      return { previousCaches };
    },

    onError: (_err, _vars, context) => {
      context?.previousCaches.forEach((data, key) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSettled: async (data) => {
      // Refetch the canonical server state. If our optimistic ordering
      // diverged from what the server now holds (e.g. from a concurrent
      // mutation), this puts the cache back in sync.
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      if (data?.id) {
        queryClient.setQueryData(queryKeys.tasks.detail(data.id), data);
      }
      await invalidateDashboard(queryClient);
    },
  });
}
