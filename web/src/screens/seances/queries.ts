import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {useSession} from '../../app/session';
import type {StudySession} from '../../lib/types';

export interface FinishedSession extends StudySession {
  minutes: number;
}

/** Newest first. Keyed by the timer's phase: pausing, finishing or resetting closes a session on the server. */
export function useStudySessions(phase: string) {
  const {api} = useSession();
  return useQuery({
    queryKey: ['study-sessions', phase],
    queryFn: ({signal}) => api.request<FinishedSession[]>('GET', '/study/sessions', {signal}),
    select: rows => (Array.isArray(rows) ? rows : []),
    placeholderData: keepPreviousData,
  });
}
