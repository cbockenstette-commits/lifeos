import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../lib/api-client.js';
import { queryKeys } from '../lib/query-keys.js';
import { invalidateDashboard } from '../api/mutations.js';
import type { Area, AreaCreate, AreaUpdate } from '@lifeos/shared';

interface AreaFilter {
  includeArchived?: boolean;
}

export function useAreas(filter: AreaFilter = {}) {
  return useQuery({
    queryKey: queryKeys.areas.list(filter),
    queryFn: () =>
      api.get<Area[]>('/areas', {
        params: filter.includeArchived ? { includeArchived: 'true' } : {},
      }),
  });
}

export function useArea(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.areas.detail(id ?? 'none'),
    queryFn: () => api.get<Area>(`/areas/${id}`),
    enabled: !!id,
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AreaCreate) => api.post<Area>('/areas', body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.areas.all() });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AreaUpdate }) =>
      api.patch<Area>(`/areas/${id}`, body),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.areas.detail(data.id), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.areas.all() });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useArchiveArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<Area>(`/areas/${id}`),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.areas.detail(data.id), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.areas.all() });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useUnarchiveArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Area>(`/areas/${id}/unarchive`),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.areas.detail(data.id), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.areas.all() });
      await invalidateDashboard(queryClient);
    },
  });
}
