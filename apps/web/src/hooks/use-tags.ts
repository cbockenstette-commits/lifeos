import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../lib/api-client.js';
import { queryKeys } from '../lib/query-keys.js';
import type {
  Tag,
  TagCreate,
  TagUpdate,
  TagAttach,
  TagEntities,
} from '@lifeos/shared';

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags.list(),
    queryFn: () => api.get<Tag[]>('/tags'),
  });
}

export function useTag(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tags.detail(id ?? 'none'),
    queryFn: () => api.get<Tag>(`/tags/${id}`),
    enabled: !!id,
  });
}

export function useTagEntities(id: string | undefined, includeArchived = false) {
  return useQuery({
    queryKey: ['tags', 'entities', id ?? 'none', includeArchived],
    queryFn: () =>
      api.get<TagEntities>(`/tags/${id}/entities`, {
        params: includeArchived ? { includeArchived: 'true' } : {},
      }),
    enabled: !!id,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TagCreate) => api.post<Tag>('/tags', body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all() });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TagUpdate }) =>
      api.patch<Tag>(`/tags/${id}`, body),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.tags.detail(data.id), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all() });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<null>(`/tags/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all() });
    },
  });
}

interface AttachArgs {
  tag_id: string;
  entity_type: TagAttach['entity_type'];
  entity_id: string;
}

export function useAttachTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tag_id, entity_type, entity_id }: AttachArgs) =>
      api.post(`/tags/${tag_id}/attach`, { entity_type, entity_id }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all() });
      // Invalidate any tag entities query and any entity-tags that reference
      // the attached entity.
      await queryClient.invalidateQueries({ queryKey: ['tags', 'entities'] });
      await queryClient.invalidateQueries({
        queryKey: ['entity-tags', variables.entity_type, variables.entity_id],
      });
    },
  });
}

export function useDetachTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tag_id, entity_type, entity_id }: AttachArgs) =>
      api.post(`/tags/${tag_id}/detach`, { entity_type, entity_id }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tags.all() });
      await queryClient.invalidateQueries({ queryKey: ['tags', 'entities'] });
      await queryClient.invalidateQueries({
        queryKey: ['entity-tags', variables.entity_type, variables.entity_id],
      });
    },
  });
}

// Per-entity tag list hook — fetches all tags and computes which ones
// are attached by cross-referencing /api/tags/:id/entities. This is
// inefficient at scale but fine for v1 single-user. Optimization deferred.
export function useEntityTags(
  entity_type: TagAttach['entity_type'] | undefined,
  entity_id: string | undefined,
) {
  return useQuery({
    queryKey: ['entity-tags', entity_type ?? 'none', entity_id ?? 'none'],
    queryFn: async () => {
      // There's no dedicated endpoint for "tags on entity X" in v1.
      // We fetch all tags and then ask each one's entities. For v1
      // scale (dozens of tags) this is acceptable.
      const allTags = await api.get<Tag[]>('/tags');
      if (allTags.length === 0) return [] as Tag[];
      const attached = await Promise.all(
        allTags.map(async (t) => {
          const entities = await api.get<TagEntities>(`/tags/${t.id}/entities`);
          const list = entities[entity_type as keyof TagEntities] ?? [];
          return list.some((e) => e.id === entity_id) ? t : null;
        }),
      );
      return attached.filter((x): x is Tag => x !== null);
    },
    enabled: !!entity_type && !!entity_id,
  });
}
