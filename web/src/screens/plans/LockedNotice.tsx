import * as stylex from '@stylexjs/stylex';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';
import type {ReactNode} from 'react';
import {en} from '../../theme/ednova.stylex';
import {Icon} from '../../ui/icons';

const styles = stylex.create({
  box: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: `${en.space2} ${en.space3}`,
    minInlineSize: 0,
    paddingBlock: en.space3,
    paddingInline: en.space4,
    borderRadius: en.radiusMd,
    backgroundColor: en.surfaceSunken,
    color: en.ink,
  },
  icon: {display: 'inline-flex', flexShrink: 0, color: en.inkMuted},
  text: {display: 'grid', gap: 2, flex: '1 1 14rem', minInlineSize: 0, overflowWrap: 'anywhere'},
  title: {margin: 0, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, fontWeight: 700},
  reason: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
});

export interface LockedNoticeProps {
  /** Already translated: the locked action's name. */
  title: string;
  /** Already translated: why it is locked; defaults to the generic Pro explanation. */
  reason?: ReactNode;
  /** Hides the "Comparer les offres" link. */
  hideLink?: boolean;
}

/** A Pro-only action that is not available on the learner's plan: says what it is, why, and where to go. */
export function LockedNotice({title, reason, hideLink = false}: LockedNoticeProps): React.JSX.Element {
  const {t} = useLingui();
  return (
    <div role="note" {...stylex.props(styles.box)}>
      <span aria-hidden="true" {...stylex.props(styles.icon)}>
        <Icon name="lock" size={20} />
      </span>
      <div {...stylex.props(styles.text)}>
        <p {...stylex.props(styles.title)}>
          {title} <Badge variant="info" label={t`Pro`} />
        </p>
        <p {...stylex.props(styles.reason)}>
          {reason ?? t`Réservé à l’offre Pro, activée par l’équipe Nova. Tu peux demander l’accès depuis la page des offres.`}
        </p>
      </div>
      {!hideLink && <Button variant="secondary" size="sm" label={t`Comparer les offres`} href="/offres" />}
    </div>
  );
}
