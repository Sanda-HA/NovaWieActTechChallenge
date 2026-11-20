import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';

export interface ErrorBannerProps {
  /** Already-translated, screen-specific message. */
  message: string;
  /** Omit when there is nothing to retry. Never called on its own: no countdown, no auto-retry. */
  onRetry?: () => void;
}

export function ErrorBanner({message, onRetry}: ErrorBannerProps): React.JSX.Element {
  const {t} = useLingui();
  return (
    <Banner
      status="error"
      role="alert"
      title={message}
      endContent={onRetry ? <Button variant="secondary" size="sm" label={t`Réessayer`} onClick={onRetry} /> : undefined}
    />
  );
}
