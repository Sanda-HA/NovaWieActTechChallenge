import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useSession} from '../../app/session';
import {setLocale} from '../../lib/i18n-store';
import type {HomeProfile} from '../accueil/queries';
import {splitSubjects, type SettingsValues} from './schema';

export function useSaveSettings() {
  const {api} = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SettingsValues) =>
      api.request<HomeProfile>('PUT', '/me/profile', {
        json: {
          city: values.city.trim(),
          subjects: splitSubjects(values.subjects),
          level: values.level,
          section: values.section,
          reply_language: values.reply_language,
          presentation: values.presentation,
          enabled_tools: values.enabled_tools,
        },
      }),
    onSuccess: async (_saved, values) => {
      setLocale(values.reply_language);
      await queryClient.invalidateQueries({queryKey: ['profile']});
    },
  });
}

export function useDeleteAccount() {
  const {api, signOut} = useSession();
  return useMutation({
    mutationFn: () => api.request('DELETE', '/auth/me'),
    onSuccess: () => signOut(),
  });
}
