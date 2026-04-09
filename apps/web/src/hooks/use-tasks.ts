import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../lib/api-client.js';
import { queryKeys } from '../lib/query-keys.js';
import { invalidateDashboard } from '../api/mutations.js';
import type { Task, TaskCreate, TaskUpdate } from '@lifeos/shared';

interface TaskFilter {
  includeArchived?: boolean;
  project_id?: string;
  area_id?: string;
  sprint_id?: string;
  status?: string;
}

export function useTasks(filter: TaskFilter = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filter),
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filter.includeArchived) params.includeArchived = 'true';
      if (filter.project_id) params.project_id = filter.project_id;
      if (filter.area_id) params.area_id = filter.area_id;
      if (filter.sprint_id) params.sprint_id = filter.sprint_id;
      if (filter.status) params.status = filter.status;
      return api.get<Task[]>('/tasks', { params });
    },
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id ?? 'none'),
    queryFn: () => api.get<Task>(`/tasks/${id}`),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TaskCreate) => api.post<Task>('/tasks', body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TaskUpdate }) =>
      api.patch<Task>(`/tasks/${id}`, body),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.tasks.detail(data.id), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useArchiveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<Task>(`/tasks/${id}`),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.tasks.detail(data.id), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useUnarchiveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Task>(`/tasks/${id}/unarchive`),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.tasks.detail(data.id), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      await invalidateDashboard(queryClient);
    },
  });
}
