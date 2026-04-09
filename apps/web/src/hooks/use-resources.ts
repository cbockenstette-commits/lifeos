import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../lib/api-client.js';
import { queryKeys } from '../lib/query-keys.js';
import { invalidateDashboard } from '../api/mutations.js';
import type { Resource, ResourceCreate, ResourceUpdate } from '@lifeos/shared';

interface ResourceFilter {
  includeArchived?: boolean;
  area_id?: string;
}

export function useResources(filter: ResourceFilter = {}) {
  return useQuery({
    queryKey: queryKeys.resources.list(filter),
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filter.includeArchived) params.includeArchived = 'true';
      if (filter.area_id) params.area_id = filter.area_id;
      return api.get<Resource[]>('/resources', { params });
    },
  });
}

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.resources.detail(id ?? 'none'),
    queryFn: () => api.get<Resource>(`/resources/${id}`),
    enabled: !!id,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ResourceCreate) => api.post<Resource>('/resources', body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.resources.all(),
      });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResourceUpdate }) =>
      api.patch<Resource>(`/resources/${id}`, body),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.resources.detail(data.id), data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.resources.all(),
      });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useArchiveResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<Resource>(`/resources/${id}`),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.resources.detail(data.id), data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.resources.all(),
      });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useUnarchiveResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Resource>(`/resources/${id}/unarchive`),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.resources.detail(data.id), data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.resources.all(),
      });
      await invalidateDashboard(queryClient);
    },
  });
}
