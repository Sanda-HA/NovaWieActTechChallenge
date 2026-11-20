import {QueryClient} from '@tanstack/react-query';

// Errors show a banner with "Réessayer": the learner decides when to retry, never a silent loop.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {retry: false, refetchOnWindowFocus: false, staleTime: 30_000},
      mutations: {retry: false},
    },
  });
}
