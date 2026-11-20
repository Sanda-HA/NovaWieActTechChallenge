import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {
  ChatComposer,
  ChatComposerInput,
  ChatLayout,
  ChatMessageList,
  ChatSendButton,
} from '@astryxdesign/core/Chat';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {useLingui} from '@lingui/react/macro';
import {useState, type KeyboardEvent} from 'react';
import {useSession} from '../../app/session';
import {useServerText} from '../../i18n/serverText';
import {subjects, type Thread} from '../../lib/tutor-workspace';
import {en} from '../../theme/ednova.stylex';
import {Icon, type IconName} from '../../ui/icons';
import {Mascot} from '../../ui/Mascot';
import {MathText} from '../../ui/MathText';
import {TurnView} from './AnswerMessage';
import {GuidedActions} from './GuidedActions';
import type {Feedback} from './FeedbackControl';

const LIMIT = 2000;
const NEXT_STEP_ICON: Record<string, IconName> = {exercise: 'target', prerequisite: 'review', next_topic: 'forward', practice_mistake: 'target'};

const styles = stylex.create({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    minInlineSize: 0,
    // The chat scrolls inside the panel, so the composer stays in reach without the page growing.
    // Phone: the space between the conversation chips and the bottom bar, so 375×812 needs no page scroll.
    blockSize: {
      default: 'max(30rem, calc(100dvh - 12.5rem))',
      '@media (640px <= width < 880px)': 'max(36rem, calc(100dvh - 19rem))',
      '@media (width < 640px)': 'max(28rem, calc(100dvh - 18.25rem))',
    },
    overflow: 'hidden',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusLg,
    backgroundColor: en.surface,
  },
  head: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: `${en.space2} ${en.space4}`,
    flexShrink: 0,
    paddingBlock: {default: en.space3, '@media (width < 640px)': en.space2},
    paddingInline: {default: en.space4, '@media (width < 640px)': en.space3},
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: en.line,
  },
  subject: {inlineSize: {default: '14rem', '@media (width < 640px)': '100%'}, minInlineSize: 0},
  privacy: {
    flex: '1 1 14rem',
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeCaptionLeading,
  },
  chip: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.lineStrong,
    backgroundColor: en.surface,
    maxInlineSize: '100%',
  },
  starter: {
    display: 'inline-flex',
    alignItems: 'center',
    minInlineSize: 0,
    maxInlineSize: '100%',
    minBlockSize: {default: en.sizeControl, '@media (width < 640px)': 36},
    paddingBlock: en.space2,
    paddingInline: en.space3,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.lineStrong,
    borderRadius: en.radiusMd,
    backgroundColor: en.surface,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeLabelSize,
    lineHeight: en.typeLabelLeading,
    fontWeight: 600,
    textAlign: 'start',
    cursor: 'pointer',
    overflowWrap: 'anywhere',
    WebkitTapHighlightColor: 'transparent',
    transitionProperty: 'background-color, border-color',
    transitionDuration: en.dur1,
    transitionTimingFunction: en.ease,
    outline: {default: '0 none', ':focus-visible': `2px solid ${en.focus}`},
    outlineOffset: 2,
  },
  starterHover: {backgroundColor: {default: en.surface, '@media (hover: hover)': {default: en.surface, ':hover': en.surfaceSunken}}},
  starters: {display: 'grid', gap: {default: en.space3, '@media (width < 640px)': en.space2}, maxInlineSize: '40rem', padding: {default: en.space4, '@media (width < 640px)': 0}, paddingInline: {default: null, '@media (width < 640px)': en.space2}, minInlineSize: 0},
  startersHead: {display: 'flex', alignItems: 'center', gap: en.space4, minInlineSize: 0},
  startersMascot: {display: {default: 'block', '@media (width < 640px)': 'none'}, flexShrink: 0},
  startersCopy: {display: 'grid', gap: en.space1, minInlineSize: 0},
  startersTitle: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: {default: en.typeTitleSize, '@media (width < 640px)': en.typeHeadingSize},
    lineHeight: {default: en.typeTitleLeading, '@media (width < 640px)': en.typeHeadingLeading},
    fontWeight: en.typeTitleWeight,
  },
  startersText: {
    display: {default: 'block', '@media (width < 640px)': 'none'},
    margin: 0,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: {default: en.typeBodyLgSize, '@media (width < 640px)': en.typeBodySize},
    lineHeight: {default: en.typeBodyLgLeading, '@media (width < 640px)': en.typeBodyLeading},
  },
  startersList: {display: 'flex', flexWrap: 'wrap', gap: en.space2, minInlineSize: 0},
  dock: {display: 'grid', gap: en.space2, minInlineSize: 0},
  actions: {display: 'flex', flexWrap: 'wrap', gap: en.space2},
  preview: {
    display: 'grid',
    gap: 2,
    paddingBlock: en.space2,
    paddingInline: en.space3,
    borderRadius: en.radiusMd,
    backgroundColor: en.surfaceSunken,
    color: en.ink,
    fontFamily: en.fontText,
    fontSize: en.typeBodySize,
    lineHeight: en.typeBodyLeading,
    overflowWrap: 'anywhere',
  },
  previewLabel: {color: en.inkMuted, fontSize: en.typeMicroSize, lineHeight: en.typeMicroLeading, fontWeight: 600},
  hint: {
    display: {default: 'block', '@media (hover: none)': 'none', '@media (width < 640px)': 'none'},
    margin: 0,
    paddingInline: en.space1,
    color: en.inkMuted,
    fontFamily: en.fontText,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
  },
  kbd: {fontFamily: 'inherit', fontWeight: 600, unicodeBidi: 'isolate'},
});

export interface ConversationProps {
  thread: Thread;
  onFeedback: (responseId: string, value: Feedback) => Promise<void>;
  tileLabelFor: (topic: string | null) => string;
}

export function Conversation({thread, onFeedback, tileLabelFor}: ConversationProps): React.JSX.Element {
  const {tutor} = useSession();
  const phone = useMediaQuery('(width < 640px)');
  const {t} = useLingui();
  const serverText = useServerText();
  const {id, subject, turns, mode, attempt} = thread;
  const last = turns.at(-1);
  const busy = last?.status === 'pending';
  const result = [...turns].reverse().find(turn => turn.status === 'complete')?.result;
  const waitingHint =
    mode === 'guided' && result?.mode === 'guided' && result.hint_rung != null && result.hint_rung >= 0 && result.hint_rung < 3;
  const [draft, setDraft] = useState('');
  const [blocked, setBlocked] = useState(false);
  const tooLong = draft.trim().length > LIMIT;

  const send = (message: string, action: string, nextMode?: 'guided' | 'free') => {
    if (nextMode) tutor.setMode(id, nextMode);
    void tutor.send(id, message, action);
  };
  const sendAction = () => (attempt ? 'attempt' : mode === 'guided' && !waitingHint ? 'new_question' : 'auto');
  const submit = (message: string) => {
    if (busy) return false;
    if (message.trim().length > LIMIT) {
      setBlocked(true);
      return false;
    }
    setBlocked(false);
    send(message, sendAction());
    return true;
  };
  const guardEnter = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    if (busy || tooLong) {
      event.preventDefault();
      if (tooLong) setBlocked(true);
    }
  };
  const changeDraft = (value: string) => {
    setDraft(value);
    if (value.trim().length <= LIMIT) setBlocked(false);
  };

  const starters = [
    subject && Object.hasOwn(subjects, subject) ? serverText(subjects[subject as keyof typeof subjects].prompt) : t`Explique-moi une notion de mon cours avec un exemple.`,
    t`Aide-moi à préparer une fiche de révision.`,
    t`Propose un exercice pour m’entraîner.`,
  ];
  const newExercise = subject ? t`Propose un nouvel exercice dans cette matière.` : t`Propose un nouvel exercice.`;
  const nextStep = result?.next_step?.request ? result.next_step : null;

  const status = blocked
    ? {type: 'error' as const, message: t`Limite de 2 000 caractères par message. Raccourcis ton texte et renvoie-le.`}
    : tooLong
      ? {type: 'error' as const, message: t`Limite de 2 000 caractères par message.`}
      : undefined;

  const subjectOptions = [
    {value: 'none', label: t`Sans préférence`},
    ...Object.entries(subjects).map(([value, {label}]) => ({value, label: serverText(label)})),
  ];

  const composer = (
    <div {...stylex.props(styles.dock)}>
      {nextStep && (
        <div {...stylex.props(styles.actions)}>
          <Button
            variant="secondary"
            size="sm"
            xstyle={styles.chip}
            icon={<Icon name={NEXT_STEP_ICON[nextStep.kind] ?? 'forward'} size={16} />}
            label={serverText(nextStep.label)}
            isDisabled={busy}
            onClick={() => {
              const next = nextStep.request;
              send(next.message, next.mode === 'guided' ? 'new_question' : 'auto', next.mode === 'guided' ? 'guided' : 'free');
            }}
          />
        </div>
      )}
      {waitingHint && result?.hint_rung != null && (
        <GuidedActions
          used={result.hint_rung}
          total={2}
          waiting={busy}
          onHint={() => {
            if (result.hint_rung != null && result.hint_rung < 2) send(t`Un indice, s’il te plaît.`, 'hint');
          }}
          onAttempt={() => tutor.setAttempt(id)}
          onNewQuestion={() => send(newExercise, 'new_question')}
        />
      )}
      {mode === 'guided' && !waitingHint && turns.length > 0 && (
        <div {...stylex.props(styles.actions)}>
          <Button
            variant="secondary"
            size="sm"
            xstyle={styles.chip}
            icon={<Icon name="new-question" size={16} />}
            label={t`Nouvel exercice`}
            isDisabled={busy}
            onClick={() => send(newExercise, 'new_question')}
          />
        </div>
      )}
      {/\$[^$]+\$/.test(draft) && (
        <div aria-live="polite" {...stylex.props(styles.preview)}>
          <span {...stylex.props(styles.previewLabel)}>{t`Aperçu`}</span>
          <MathText text={draft} />
        </div>
      )}
      <ChatComposer
        value={draft}
        onChange={changeDraft}
        onSubmit={message => void submit(message)}
        placeholder={attempt ? t`Écris ta réponse…` : t`Pose ta question…`}
        status={status}
        headerActions={
          <SegmentedControl label={t`Mode`} size="sm" value={mode === 'guided' ? 'guided' : 'free'} onChange={value => tutor.setMode(id, value)}>
            <SegmentedControlItem value="free" label={t`Libre`} />
            <SegmentedControlItem value="guided" label={t`Guidé`} />
          </SegmentedControl>
        }
        input={<ChatComposerInput label={attempt ? t`Ta réponse` : t`Ta question`} maxRows={6} onKeyDown={guardEnter} />}
        sendButton={
          <ChatSendButton
            isDisabled={busy || draft.trim().length === 0}
            onSend={() => {
              if (submit(draft)) setDraft('');
            }}
          />
        }
      />
      <p {...stylex.props(styles.hint)}>
        {t`Entrée pour envoyer · Maj + Entrée pour aller à la ligne · formule entre dollars :`} <kbd translate="no" {...stylex.props(styles.kbd)}>{'$x^2$'}</kbd> →{' '}
        <MathText text="$x^2$" />
      </p>
    </div>
  );

  return (
    <section aria-label={t`Conversation avec le tuteur`} {...stylex.props(styles.panel)}>
      <header {...stylex.props(styles.head)}>
        <div {...stylex.props(styles.subject)}>
          <Selector
            label={t`Matière`}
            // The chosen subject names itself on a phone; the label stays for screen readers.
            isLabelHidden={phone}
            options={subjectOptions}
            value={subject || 'none'}
            isDisabled={turns.length > 0}
            onChange={value => tutor.setSubject(id, value === 'none' ? '' : value)}
          />
        </div>
        <p {...stylex.props(styles.privacy)}>{t`L'historique de tes échanges n'est pas enregistré dans ton compte.`}</p>
      </header>
      <ChatLayout
        composer={composer}
        // Nothing to scroll back to in an empty conversation: its room goes to the starters on a phone.
        scrollButton={turns.length > 0 ? undefined : null}
        emptyState={
          <div {...stylex.props(styles.starters)}>
            <div {...stylex.props(styles.startersHead)}>
              <span {...stylex.props(styles.startersMascot)}>
                <Mascot mood="idle" size={56} />
              </span>
              <div {...stylex.props(styles.startersCopy)}>
                <h2 {...stylex.props(styles.startersTitle)}>{t`Que veux-tu apprendre aujourd’hui ?`}</h2>
                <p {...stylex.props(styles.startersText)}>{t`Pose une question ou choisis une idée pour commencer.`}</p>
              </div>
            </div>
            <div {...stylex.props(styles.startersList)}>
              {starters.map(prompt => (
                <button key={prompt} type="button" onClick={() => send(prompt, mode === 'guided' ? 'new_question' : 'auto')} {...stylex.props(styles.starter, styles.starterHover)}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        }>
        {turns.length > 0 ? (
          <ChatMessageList aria-label={t`Messages`} isStreaming={busy}>
            {turns.map((turn, index) => (
              <TurnView
                key={`${id}:${index}`}
                turn={turn}
                last={turn === last}
                onRetry={() => void tutor.retry(id)}
                onFeedback={onFeedback}
                tileLabelFor={tileLabelFor}
              />
            ))}
          </ChatMessageList>
        ) : null}
      </ChatLayout>
    </section>
  );
}

