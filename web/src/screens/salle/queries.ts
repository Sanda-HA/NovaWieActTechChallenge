import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useSession} from '../../app/session';
import type {createRoomsStore} from '../../lib/rooms-store';
import type {Room} from '../../lib/types';

/** What `GET /groups/rooms` returns beyond the typed `Room`. */
export interface RoomDetail extends Room {
  active_members?: string[];
  session_round?: string | null;
}

export const PAGE_SIZE = 50; // the backend's MAX_POSTS
export const PREFERRED_TOPIC = 'derivabilite';

export type RoomsStore = ReturnType<typeof createRoomsStore>;

export interface RoomConsent {
  allow_ai_text: boolean;
  allow_solo_context: boolean;
  allow_personalization: boolean;
  allow_group_insights: boolean;
  /** Read-only: whether this deployment lets the model read member text at all. */
  raw_text_allowed?: boolean;
}

export type ConsentKey = Exclude<keyof RoomConsent, 'raw_text_allowed'>;

export const CONSENT_KEYS: readonly ConsentKey[] = ['allow_ai_text', 'allow_solo_context', 'allow_personalization', 'allow_group_insights'];

export type ExplanationFormat = 'step_by_step' | 'examples' | 'visual' | 'analogy';

export interface RoomInsights {
  topic: string;
  review_concepts: string[];
  asked_concepts: string[];
  covered_concepts: string[];
  helpful_formats: {concept: string; format: ExplanationFormat}[];
}

/** The learner's own choices in this room; readable on any plan, so withdrawal is never locked. */
export function useRoomConsent(roomId: string) {
  const {api} = useSession();
  return useQuery({
    queryKey: ['room-consent', roomId],
    queryFn: ({signal}) => api.request<RoomConsent>('GET', `/groups/rooms/${roomId}/consent`, {signal}),
  });
}

export function useUpdateConsent(roomId: string) {
  const {api} = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Record<ConsentKey, boolean>>) => api.request<RoomConsent>('PATCH', `/groups/rooms/${roomId}/consent`, {json: patch}),
    onSuccess: saved => queryClient.setQueryData(['room-consent', roomId], saved),
  });
}

export function useUpdateSettings(roomId: string) {
  const {api} = useSession();
  return useMutation({
    mutationFn: (patch: {tutor_enabled?: boolean; tutor_round_prompts?: boolean}) =>
      api.request<Room>('PATCH', `/groups/rooms/${roomId}/settings`, {json: patch}),
  });
}

/** Concept patterns of the current session; only while it is running. */
export function useRoomInsights(roomId: string, enabled: boolean) {
  const {api} = useSession();
  return useQuery({
    queryKey: ['room-insights', roomId],
    queryFn: ({signal}) => api.request<RoomInsights>('GET', `/groups/rooms/${roomId}/session/insights`, {signal}),
    enabled,
    refetchInterval: 20_000,
    retry: false,
  });
}
