import {useMutation, useQuery} from '@tanstack/react-query';
import {useSession} from '../../app/session';
import {toBank, type DiagnosticData, type DiagnosticResponse} from './diagnosticBank';

export function useDiagnosticBank() {
  const {api} = useSession();
  return useQuery({
    queryKey: ['diagnostic-bank'],
    queryFn: async ({signal}) => toBank(await api.request<DiagnosticData>('GET', '/learning/diagnostic', {signal})),
  });
}

export function useSubmitDiagnostic() {
  const {api} = useSession();
  return useMutation({
    mutationFn: (answers: Record<string, string>) => api.request<DiagnosticResponse>('POST', '/learning/diagnostic', {json: {answers}}),
  });
}
