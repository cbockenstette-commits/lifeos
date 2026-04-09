import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../lib/api-client.js';
import { queryKeys } from '../lib/query-keys.js';
import { invalidateDashboard } from '../api/mutations.js';
import type { Sprint, SprintCreate, SprintUpdate } from '@lifeos/shared';

export function useSprints() {
  return useQuery({
    queryKey: queryKeys.sprints.list(),
    queryFn: () => api.get<Sprint[]>('/sprints'),
  });
}

export function useSprint(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sprints.detail(id ?? 'none'),
    queryFn: () => api.get<Sprint>(`/sprints/${id}`),
    enabled: !!id,
  });
}

export function useCurrentSprint() {
  return useQuery({
    queryKey: queryKeys.sprints.current(),
    queryFn: () => api.get<Sprint>('/sprints/current'),
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SprintCreate) => api.post<Sprint>('/sprints', body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sprints.all(),
      });
      await invalidateDashboard(queryClient);
    },
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SprintUpdate }) =>
      api.patch<Sprint>(`/sprints/${id}`, body),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.sprints.detail(data.id), data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sprints.all(),
      });
      await invalidateDashboard(queryClient);
    },
  });
}
