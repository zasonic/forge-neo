import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../lib/store.js';
import type { ApiContext } from '../lib/apiClient.js';
import { queryKeys } from '../lib/queryKeys.js';

export function useApiContext(): ApiContext | null {
  const status = useAppStore((s) => s.status);
  const auth = useQuery({
    queryKey: queryKeys.apiAuth,
    queryFn: async () => (await window.forge.settings.get()).apiAuth,
    staleTime: Infinity,
  });

  if (status.kind !== 'ready' || auth.isLoading) return null;
  return { baseUrl: status.baseUrl, auth: auth.data ?? null };
}
