import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../lib/api-client.js';
import { queryKeys } from '../lib/query-keys.js';
import { invalidateDashboard } from '../api/mutations.js';
import type { Project, ProjectCreate, ProjectUpdate } from '@lifeos/shared';

interface ProjectFilter {
  includeArchived?: boolean;
  area_id?: string;
  status?: string;
}

export function useProjects(filter: ProjectFilter = {}) {
  return useQuery({
    queryKey: queryKeys.projects.list(filter),
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filter.includeArchived) params.includeArchived = 'true';
      if (filter.area_id) params.area_id = filter.area_id;
      if (filter.status) params.status = filter.status;
      return api.get<Project[]>('/projects', { params });
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id ?? 'none'),
    queryFn: () => api.get<Project>(`/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProjectCreate) => api.post<Project>('/projects', body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all(),
      });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ProjectUpdate }) =>
      api.patch<Project>(`/projects/${id}`, body),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.projects.detail(data.id), data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all(),
      });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<Project>(`/projects/${id}`),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.projects.detail(data.id), data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all(),
      });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useUnarchiveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Project>(`/projects/${id}/unarchive`),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.projects.detail(data.id), data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all(),
      });
      await invalidateDashboard(queryClient);
    },
  });
}
