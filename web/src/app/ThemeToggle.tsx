import {useMediaQuery} from '@astryxdesign/core/hooks';
import {IconButton} from '@astryxdesign/core/IconButton';
import {useLingui} from '@lingui/react/macro';
import {Icon} from '../ui/icons';
import {useStore} from './session';
import {themeMode} from './themeMode';

/** Jour/Nuit switch, copy and icons as in ui-preview's header. */
export function ThemeToggle(): React.JSX.Element {
  const {t} = useLingui();
  const mode = useStore(themeMode);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = mode === 'dark' || (mode === 'system' && systemDark);
  return (
    <IconButton
      variant="ghost"
      label={dark ? t`Passer en mode Jour` : t`Passer en mode Nuit`}
      icon={<Icon name={dark ? 'sun' : 'moon'} />}
      onClick={() => themeMode.set(dark ? 'light' : 'dark')}
    />
  );
}
