import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {plural} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {useEffect, useRef, type Ref} from 'react';
import {en} from '../../theme/ednova.stylex';
import {Icon} from '../../ui/icons';
import {MasteryTessera} from '../../ui/MasteryTessera';
import {MASTERY_WORDS} from '../../ui/Mosaic';
import {LockedNotice} from '../plans/LockedNotice';
import {MasteryRow} from './MasteryRow';
import type {MapChapter} from './queries';
import {intlLocale} from '../../lib/i18n-store';

const styles = stylex.create({
  panel: {
    display: 'grid',
    alignContent: 'start',
    gap: en.space4,
    minInlineSize: 0,
    padding: en.space5,
    borderRadius: en.radiusLg,
    backgroundColor: en.surfaceSunken,
    position: {default: null, '@media (width >= 1100px)': 'sticky'},
    insetBlockStart: en.space4,
  },
  nova: {display: 'flex', alignItems: 'center', gap: en.space3},
  novaText: {display: 'grid', gap: 2, minInlineSize: 0},
  kicker: {
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  title: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: en.typeHeadingWeight,
    overflowWrap: 'anywhere',
    outline: '0 none',
  },
  text: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  focus: {display: 'flex', alignItems: 'flex-start', gap: en.space3, minInlineSize: 0},
  focusText: {display: 'grid', gap: en.space1, minInlineSize: 0, overflowWrap: 'anywhere'},
  caption: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  list: {display: 'grid', margin: 0, padding: 0, listStyle: 'none'},
  actions: {display: 'flex', flexWrap: 'wrap', gap: en.space2},
});

export interface ChapterPanelProps {
  /** null until a tile is opened. */
  chapter: MapChapter | null;
  translateLabel: (label: string) => string;
  quizOpen: boolean;
  /** The chapter quiz is Pro: a Free learner sees why instead of the button. */
  quizLocked?: boolean;
  onQuiz: () => void;
  /** The lab on this chapter (Pro). A Free learner sees the lab notice under the map instead. */
  onLab?: () => void;
  onPractise: (chapter: MapChapter) => void;
  ref?: Ref<HTMLElement>;
}

/** The opened chapter: where it stands, its sub-chapters, and the ways to work on it. */
export function ChapterPanel({chapter, translateLabel, quizOpen, quizLocked = false, onQuiz, onLab, onPractise, ref}: ChapterPanelProps): React.JSX.Element {
  const {i18n, t} = useLingui();
  const heading = useRef<HTMLHeadingElement>(null);
  const wasOpen = useRef(false);
  const attempts = chapter?.attempts ?? 0;

  // Closing the quiz removes the button that opened it: put focus back on the chapter.
  useEffect(() => {
    if (wasOpen.current && !quizOpen) heading.current?.focus();
    wasOpen.current = quizOpen;
  }, [quizOpen]);

  return (
    <aside ref={ref} aria-label={t`Chapitre`} aria-live="polite" {...stylex.props(styles.panel)}>
      {chapter ? (
        <>
          <div {...stylex.props(styles.focus)}>
            <MasteryTessera level={chapter.level} size={40} label="" />
            <div {...stylex.props(styles.focusText)}>
              <p {...stylex.props(styles.kicker)}>
                <Trans>Chapitre</Trans>
              </p>
              <h2 ref={heading} tabIndex={-1} {...stylex.props(styles.title)}>
                {translateLabel(chapter.label)}
              </h2>
              <p {...stylex.props(styles.caption)}>
                {i18n._(MASTERY_WORDS[chapter.level])}
                {chapter.mastery != null && ` · ${new Intl.NumberFormat(intlLocale(i18n.locale), {style: 'percent', maximumFractionDigits: 0}).format(chapter.mastery)}`}
                {attempts > 0 && ` · ${t`${plural(attempts, {one: '# essai', other: '# essais'})}`}`}
              </p>
            </div>
          </div>
          {chapter.subtopics.length > 0 && (
            <div {...stylex.props(styles.focusText)}>
              <p {...stylex.props(styles.kicker)}>
                <Trans>Dans ce chapitre</Trans>
              </p>
              <ul aria-label={t`Dans ce chapitre`} {...stylex.props(styles.list)}>
                {chapter.subtopics.map(sub => (
                  <MasteryRow key={sub.id} label={translateLabel(sub.label)} mastery={sub.mastery} level={sub.level} attempts={sub.attempts} />
                ))}
              </ul>
            </div>
          )}
          <div {...stylex.props(styles.actions)}>
            {!quizOpen && !quizLocked && <Button variant="primary" label={t`Quiz du chapitre`} icon={<Icon name="question" size={20} />} onClick={onQuiz} />}
            {onLab && <Button variant="secondary" label={t`Labo interactif`} icon={<Icon name="target" size={20} />} onClick={onLab} />}
            <Button variant="secondary" label={t`S’entraîner sur ce chapitre`} icon={<Icon name="target" size={20} />} onClick={() => onPractise(chapter)} />
          </div>
          {quizLocked && (
            <LockedNotice
              title={t`Quiz du chapitre`}
              reason={t`Le quiz personnel par chapitre est réservé à l’offre Pro. Le quiz d’exemple reste ouvert à tous.`}
            />
          )}
        </>
      ) : (
        <div {...stylex.props(styles.nova)}>
          <div {...stylex.props(styles.novaText)}>
            <p {...stylex.props(styles.kicker)}>
              <Trans>Chapitre</Trans>
            </p>
            <p {...stylex.props(styles.text)}>
              <Trans>Touche une pièce de la carte pour ouvrir le chapitre.</Trans>
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
