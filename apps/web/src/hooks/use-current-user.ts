import { useEffect, useRef } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '../lib/api-client.js';
import { queryKeys } from '../lib/query-keys.js';
import type { User, UserUpdate } from '@lifeos/shared';

export function useCurrentUser() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.user.me(),
    queryFn: () => api.get<User>('/users/me'),
    // User row rarely changes; let it sit for 5 minutes.
    staleTime: 5 * 60_000,
  });

  const patchMutation = useMutation({
    mutationFn: (body: UserUpdate) => api.patch<User>('/users/me', body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.user.me(), data);
    },
  });

  // ADR-8: browser timezone auto-detect.
  //
  // On first successful load, if the browser's IANA timezone differs from
  // the user's stored timezone, PATCH it once per session. This lets the
  // app self-correct when the user works from a different location than
  // their default (e.g. traveling outside Idaho). The hasRun ref prevents
  // loops if the PATCH itself triggers a refetch.
  const hasAutoDetected = useRef(false);
  useEffect(() => {
    if (hasAutoDetected.current) return;
    if (!query.data) return;
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTz) return;
    if (browserTz === query.data.timezone) {
      hasAutoDetected.current = true;
      return;
    }
    hasAutoDetected.current = true;
    patchMutation.mutate({ timezone: browserTz });
  }, [query.data, patchMutation]);

  return query;
}

export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UserUpdate) => api.patch<User>('/users/me', body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.user.me(), data);
    },
  });
}
