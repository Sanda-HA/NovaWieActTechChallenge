import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';
import {useEffect} from 'react';
import {useSession} from '../app/session';
import {en} from '../theme/ednova.stylex';
import {Mascot} from '../ui/Mascot';
import {ScreenTitle} from './ScreenTitle';

const styles = stylex.create({
  area: {
    display: 'grid',
    justifyItems: 'center',
    alignContent: 'center',
    gap: en.space5,
    minBlockSize: '100dvh',
    paddingBlock: en.space8,
    paddingInline: en.space4,
    textAlign: 'center',
  },
  text: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, textWrap: 'pretty'},
});

/** Any URL the router does not know: Nova peeks in, with a way back to the learner's home. */
export function Component(): React.JSX.Element {
  const {t} = useLingui();
  const {status} = useSession();
  const signedIn = status === 'signedIn';
  const title = t`Page introuvable`;

  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · Nova`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <main {...stylex.props(styles.area)}>
      <Mascot mood="peek" size={120} />
      <ScreenTitle>{title}</ScreenTitle>
      <p {...stylex.props(styles.text)}>{t`Nova a cherché partout, mais cette page n’existe pas.`}</p>
      <Button
        variant="primary"
        label={signedIn ? t`Retour à l’accueil` : t`Retour à la bienvenue`}
        href={signedIn ? '/accueil' : '/bienvenue'}
      />
    </main>
  );
}
