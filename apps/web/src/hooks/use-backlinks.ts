import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../lib/api-client.js';
import type {
  HydratedLinks,
  EntityLink,
  EntityLinkCreate,
  EntityType,
} from '@lifeos/shared';

export function useBacklinks(
  entity_type: EntityType | undefined,
  entity_id: string | undefined,
  includeArchived = false,
) {
  return useQuery({
    queryKey: ['backlinks', entity_type ?? 'none', entity_id ?? 'none', includeArchived],
    queryFn: () =>
      api.get<HydratedLinks>('/entity-links/hydrated', {
        params: {
          entity_type: entity_type!,
          entity_id: entity_id!,
          ...(includeArchived ? { includeArchived: 'true' } : {}),
        },
      }),
    enabled: !!entity_type && !!entity_id,
  });
}

export function useCreateEntityLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EntityLinkCreate) =>
      api.post<EntityLink>('/entity-links', body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['backlinks'] });
    },
  });
}

export function useDeleteEntityLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/entity-links/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['backlinks'] });
    },
  });
}
