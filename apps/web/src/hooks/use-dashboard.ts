import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client.js';
import { queryKeys } from '../lib/query-keys.js';
import type { Dashboard } from '@lifeos/shared';

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: () => api.get<Dashboard>('/dashboard'),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
