import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';
import {en} from '../../theme/ednova.stylex';
import {Icon} from '../../ui/icons';

export interface ThreadEntry {
  id: number;
  /** Already translated: the subject, or "Sans matière". */
  subject: string;
  /** The learner's first question, or "Nouvelle conversation". */
  title: string;
  /** A title the learner wrote is shown as typed, never translated. */
  typed: boolean;
}

export interface ThreadListProps {
  threads: readonly ThreadEntry[];
  activeId: number;
  onSelect: (id: number) => void;
  onNew: () => void;
}

const styles = stylex.create({
  aside: {
    display: {default: 'grid', '@media (width < 640px)': 'flex'},
    alignItems: {default: 'normal', '@media (width < 640px)': 'stretch'},
    alignContent: 'start',
    gap: {default: en.space3, '@media (width < 640px)': en.space2},
    minInlineSize: 0,
    maxInlineSize: '100%',
    padding: {default: en.space4, '@media (width < 640px)': 0},
    borderWidth: {default: 1, '@media (width < 640px)': 0},
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusLg,
    backgroundColor: {default: en.surface, '@media (width < 640px)': 'transparent'},
    // On a phone the whole bar scrolls sideways: "Nouvelle conversation", then the conversations.
    overflowX: {default: 'visible', '@media (width < 640px)': 'auto'},
  },
  title: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: en.typeHeadingWeight,
  },
  titleHidden: {
    position: {default: null, '@media (width < 640px)': 'absolute'},
    inlineSize: {default: null, '@media (width < 640px)': 1},
    blockSize: {default: null, '@media (width < 640px)': 1},
    margin: {default: 0, '@media (width < 640px)': -1},
    overflow: {default: null, '@media (width < 640px)': 'hidden'},
    clipPath: {default: null, '@media (width < 640px)': 'inset(50%)'},
    whiteSpace: {default: null, '@media (width < 640px)': 'nowrap'},
  },
  newButton: {
    flexShrink: 0,
    alignSelf: {default: null, '@media (width < 640px)': 'center'},
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.lineStrong,
    backgroundColor: en.surface,
  },
  list: {
    display: {default: 'flex', '@media (width < 640px)': 'contents'},
    flexDirection: 'column',
    gap: en.space1,
    maxBlockSize: '21rem',
    margin: 0,
    padding: 0,
    listStyle: 'none',
    overflow: 'auto',
  },
  item: {flexShrink: 0, minInlineSize: 0, inlineSize: {default: 'auto', '@media (width < 640px)': '11rem'}, display: 'flex'},
  entry: {
    display: 'grid',
    gap: 2,
    inlineSize: '100%',
    minInlineSize: 0,
    paddingBlock: en.space2,
    paddingInline: en.space3,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderRadius: en.radiusMd,
    color: en.ink,
    fontFamily: en.fontText,
    textAlign: 'start',
    cursor: 'pointer',
    overflowWrap: 'anywhere',
    transitionProperty: 'background-color, border-color',
    transitionDuration: en.dur1,
    transitionTimingFunction: en.ease,
    outline: {default: '0 none', ':focus-visible': `2px solid ${en.focus}`},
    outlineOffset: 2,
  },
  entryHover: {backgroundColor: {default: 'transparent', '@media (hover: hover)': {default: 'transparent', ':hover': en.surfaceSunken}}},
  current: {backgroundColor: en.surfaceSunken, borderColor: en.lineStrong},
  subject: {color: en.inkMuted, fontSize: en.typeMicroSize, lineHeight: en.typeMicroLeading, fontWeight: 600},
  name: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    // One line on a phone, so the row of conversations leaves the chat its height.
    WebkitLineClamp: {default: 2, '@media (width < 640px)': 1},
    overflow: 'hidden',
    fontSize: en.typeLabelSize,
    lineHeight: en.typeLabelLeading,
    fontWeight: 600,
  },
});

/** The learner's conversations of this visit: a list beside the chat, a row of cards above it on a phone. */
export function ThreadList({threads, activeId, onSelect, onNew}: ThreadListProps): React.JSX.Element {
  const {t} = useLingui();
  return (
    <aside aria-label={t`Conversations`} {...stylex.props(styles.aside)}>
      <h2 {...stylex.props(styles.title, styles.titleHidden)}>{t`Conversations`}</h2>
      <Button variant="secondary" xstyle={styles.newButton} icon={<Icon name="new-question" size={20} />} label={t`Nouvelle conversation`} onClick={onNew} />
      <ul {...stylex.props(styles.list)}>
        {threads.map(thread => (
          <li key={thread.id} {...stylex.props(styles.item)}>
            <button
              type="button"
              aria-current={thread.id === activeId ? 'true' : undefined}
              onClick={() => onSelect(thread.id)}
              {...stylex.props(styles.entry, thread.id === activeId ? styles.current : styles.entryHover)}>
              <span {...stylex.props(styles.subject)}>{thread.subject}</span>
              <span translate={thread.typed ? 'no' : undefined} {...stylex.props(styles.name)}>
                {thread.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
