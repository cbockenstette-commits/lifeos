// Centralized React Query keys. Every hook imports from here — no inline
// string arrays anywhere. Makes invalidation predictable and refactor-safe.

export const queryKeys = {
  user: {
    me: () => ['user', 'me'] as const,
  },
  dashboard: () => ['dashboard'] as const,
  areas: {
    all: () => ['areas'] as const,
    list: (filter?: { includeArchived?: boolean }) =>
      ['areas', 'list', filter ?? {}] as const,
    detail: (id: string) => ['areas', 'detail', id] as const,
  },
  projects: {
    all: () => ['projects'] as const,
    list: (filter?: {
      includeArchived?: boolean;
      area_id?: string;
      status?: string;
    }) => ['projects', 'list', filter ?? {}] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
  tasks: {
    all: () => ['tasks'] as const,
    list: (filter?: {
      includeArchived?: boolean;
      project_id?: string;
      area_id?: string;
      sprint_id?: string;
      status?: string;
    }) => ['tasks', 'list', filter ?? {}] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },
  resources: {
    all: () => ['resources'] as const,
    list: (filter?: { includeArchived?: boolean; area_id?: string }) =>
      ['resources', 'list', filter ?? {}] as const,
    detail: (id: string) => ['resources', 'detail', id] as const,
  },
  sprints: {
    all: () => ['sprints'] as const,
    list: () => ['sprints', 'list'] as const,
    current: () => ['sprints', 'current'] as const,
    detail: (id: string) => ['sprints', 'detail', id] as const,
  },
  tags: {
    all: () => ['tags'] as const,
    list: () => ['tags', 'list'] as const,
    detail: (id: string) => ['tags', 'detail', id] as const,
  },
  entityLinks: {
    forEntity: (entity_type: string, entity_id: string) =>
      ['entity-links', entity_type, entity_id] as const,
  },
} as const;
