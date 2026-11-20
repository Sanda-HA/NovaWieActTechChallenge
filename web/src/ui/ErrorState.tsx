import * as stylex from '@stylexjs/stylex';
import {en} from '../theme/ednova.stylex';
import {ErrorBanner} from './ErrorBanner';
import {Mascot} from './Mascot';

export interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const styles = stylex.create({
  area: {
    display: 'grid',
    justifyItems: 'center',
    alignContent: 'center',
    gap: en.space5,
    minBlockSize: 'min(60dvh, 32rem)',
    paddingBlock: en.space8,
    paddingInline: en.space4,
  },
  banner: {inlineSize: '100%', maxInlineSize: '32rem'},
});

/** Takes the whole content area when a screen has nothing to show without the backend. */
export function ErrorState({message, onRetry}: ErrorStateProps): React.JSX.Element {
  return (
    <div {...stylex.props(styles.area)}>
      <Mascot mood="calm" size={96} />
      <div {...stylex.props(styles.banner)}>
        <ErrorBanner message={message} onRetry={onRetry} />
      </div>
    </div>
  );
}
