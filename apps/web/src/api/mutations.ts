// Centralized mutation helpers + the canonical invalidateDashboard().
//
// Every mutation hook that touches Task, Sprint, or Resource MUST call
// invalidateDashboard(queryClient) in its onSuccess — that's the
// dashboard cache-coherence rule. ARCHITECTURE.md (P8) will enshrine this.
//
// This file is intentionally introduced in P3, BEFORE any real mutation
// hooks exist, so downstream phases have a single import target and the
// "don't forget to invalidate" mistake is structurally hard to make.

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-keys.js';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/**
 * Canonical dashboard invalidation helper.
 *
 * Call this from any mutation's onSuccess/onSettled when the mutation
 * touches Task, Sprint, or Resource data. The dashboard aggregator (P6)
 * reads from all three, so we invalidate the dashboard cache key whenever
 * any of those entities change.
 *
 * Example (will land in P4+):
 *   useMutation({
 *     mutationFn: (body) => api.post('/tasks', body),
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
 *       invalidateDashboard(queryClient);
 *     },
 *   });
 */
export function invalidateDashboard(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
}
