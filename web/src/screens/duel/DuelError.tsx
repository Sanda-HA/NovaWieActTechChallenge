import {useLingui} from '@lingui/react/macro';
import {describeDuelError} from '../../lib/duel';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {LockedNotice} from '../plans/LockedNotice';
import {ERRORS} from './messages';

export interface DuelErrorProps {
  error: unknown;
  onRetry?: () => void;
}

/** A failed duel request: a locked notice when the plan is the problem, otherwise the reason and a retry. */
export function DuelError({error, onRetry}: DuelErrorProps): React.JSX.Element {
  const {i18n, t} = useLingui();
  const code = describeDuelError(error);
  if (code === 'pro_required') return <LockedNotice title={t`Duel Exam`} reason={i18n._(ERRORS.pro_required)} />;
  const retryable = code === 'network' || code === 'unavailable' || code === 'code_unavailable';
  return <ErrorBanner message={i18n._(ERRORS[code])} onRetry={retryable ? onRetry : undefined} />;
}
