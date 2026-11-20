import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useMemo, useRef} from 'react';
import {useSession} from '../../app/session';
import {
  betterSample,
  createDuelActions,
  pollInterval,
  sampleClock,
  type Blueprint,
  type ClockSample,
  type DuelPhase,
  type DuelResult,
  type DuelView,
  type Exam,
} from '../../lib/duel';
import type {ApiError} from '../../lib/types';

export const duelBase = (roomId: string) => `/groups/rooms/${roomId}/duels`;

/** A failure that will not go away by asking again. */
const transient = (count: number, error: unknown) => {
  const status = (error as ApiError).status;
  return count < 2 && (status === undefined || status >= 500);
};

export function useBlueprints(roomId: string) {
  const {api} = useSession();
  return useQuery({
    queryKey: ['duel-blueprints', roomId],
    queryFn: ({signal}) => api.request<Blueprint[]>('GET', `${duelBase(roomId)}/blueprints`, {signal}),
    staleTime: 5 * 60_000,
  });
}

export function useDuels(roomId: string) {
  const {api} = useSession();
  return useQuery({
    queryKey: ['duels', roomId],
    queryFn: ({signal}) => api.request<{items: DuelView[]}>('GET', duelBase(roomId), {signal}),
    refetchInterval: 5000,
    staleTime: 0,
  });
}

export interface DuelSnapshot {
  view: DuelView;
  /** Server time minus local time (ms), from the best of the polls so far. */
  offset: number;
}

/** The duel, polled: slowly in the lobby, every second once a start is set; stops once it is over. */
export function useDuel(roomId: string, duelId: string) {
  const {api} = useSession();
  const best = useRef<ClockSample | null>(null);
  return useQuery({
    queryKey: ['duel', roomId, duelId],
    queryFn: async ({signal}): Promise<DuelSnapshot> => {
      const sent = Date.now();
      const read = await api.request<DuelView>('GET', `${duelBase(roomId)}/${duelId}`, {signal});
      best.current = betterSample(best.current, sampleClock(read.server_now, sent, Date.now()));
      return {view: read, offset: best.current.offset};
    },
    refetchInterval: query => (query.state.data ? pollInterval(query.state.data.view.status) : false),
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: transient,
  });
}

/** The questions, once the exam has started; the server answers 409 `duel_exam_unavailable` until then. */
export function useExam(roomId: string, duelId: string, status: DuelPhase | undefined) {
  const {api} = useSession();
  const open = status === 'running' || status === 'grading' || status === 'finished';
  return useQuery({
    queryKey: ['duel-exam', roomId, duelId],
    queryFn: ({signal}) => api.request<Exam>('GET', `${duelBase(roomId)}/${duelId}/exam`, {signal}),
    enabled: open,
    staleTime: Infinity,
    retry: (count, error) => count < 4 && (error as ApiError).status === 409,
    retryDelay: 500,
  });
}

export type ResultBody = DuelResult | {status: DuelPhase};

export function useDuelResult(roomId: string, duelId: string, enabled: boolean) {
  const {api} = useSession();
  return useQuery({
    queryKey: ['duel-result', roomId, duelId],
    queryFn: ({signal}) => api.request<ResultBody>('GET', `${duelBase(roomId)}/${duelId}/result`, {signal}),
    enabled,
    staleTime: 0,
    refetchInterval: query => (query.state.data && 'outcome' in query.state.data ? false : 1500),
  });
}

/** The debrief is read on its own, so that a slow debrief never holds the result back. */
export function useDebrief(roomId: string, duelId: string, enabled: boolean) {
  const {api} = useSession();
  return useQuery({
    queryKey: ['duel-debrief', roomId, duelId],
    queryFn: ({signal}) => api.request<ResultBody>('GET', `${duelBase(roomId)}/${duelId}/result`, {signal}),
    enabled,
    staleTime: 0,
    refetchInterval: query => {
      const body = query.state.data;
      return body && 'outcome' in body && body.debrief_status !== 'pending' ? false : 3000;
    },
  });
}

export function useDuelActions(roomId: string) {
  const {api} = useSession();
  const queryClient = useQueryClient();
  const actions = useMemo(() => createDuelActions(api, roomId), [api, roomId]);
  const saved = (view: DuelView) => {
    queryClient.setQueryData<DuelSnapshot>(['duel', roomId, view.duel_id], previous => ({view, offset: previous?.offset ?? 0}));
    return queryClient.invalidateQueries({queryKey: ['duels', roomId]});
  };
  return {
    create: useMutation({
      mutationFn: ({blueprintId, opponent}: {blueprintId: string; opponent?: string}) => actions.create(blueprintId, opponent),
      onSuccess: saved,
    }),
    join: useMutation({mutationFn: (code: string) => actions.join(code), onSuccess: saved}),
    accept: useMutation({mutationFn: (duelId: string) => actions.accept(duelId), onSuccess: saved}),
    ready: useMutation({
      mutationFn: ({duelId, ready}: {duelId: string; ready: boolean}) => actions.ready(duelId, ready),
      onSuccess: saved,
    }),
    withdraw: useMutation({mutationFn: (duelId: string) => actions.withdraw(duelId), onSuccess: saved}),
  };
}
