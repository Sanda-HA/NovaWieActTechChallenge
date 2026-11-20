import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useSession} from '../../app/session';
import {planOf} from '../../lib/plans';
import type {StudentPlan} from '../../lib/types';
import {useProfile, type HomeProfile} from '../accueil/queries';

export function usePlan(): {plan: StudentPlan | null; requested: boolean; isError: boolean; refetch: () => void} {
  const profile = useProfile();
  return {
    plan: planOf(profile.data),
    requested: profile.data?.pro_requested === true,
    isError: profile.isError,
    refetch: () => void profile.refetch(),
  };
}

/** Queues a Pro access request; the server answers with the profile, which carries `pro_requested`. */
export function useRequestPro() {
  const {api} = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.request<HomeProfile>('POST', '/me/pro-request'),
    onSuccess: saved => {
      queryClient.setQueryData<HomeProfile>(['profile'], previous => ({...previous, ...saved}));
      return queryClient.invalidateQueries({queryKey: ['profile']});
    },
  });
}

/** Withdraws the pending request; the server answers 204, so the cached profile is cleared by hand. */
export function useCancelProRequest() {
  const {api} = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.request<null>('DELETE', '/me/pro-request'),
    onSuccess: () => {
      queryClient.setQueryData<HomeProfile>(['profile'], previous => previous && {...previous, pro_requested: false});
      return queryClient.invalidateQueries({queryKey: ['profile']});
    },
  });
}
