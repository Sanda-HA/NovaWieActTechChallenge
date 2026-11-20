import * as stylex from '@stylexjs/stylex';
import {ChatMessage, ChatMessageBubble} from '@astryxdesign/core/Chat';
import {Citation} from '@astryxdesign/core/Citation';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {Fragment, useEffect, useState} from 'react';
import {useServerText} from '../../i18n/serverText';
import {answerBlocks, answerInline, type Turn} from '../../lib/tutor-workspace';
import type {ChatResult} from '../../lib/types';
import {en} from '../../theme/ednova.stylex';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Icon, type IconName} from '../../ui/icons';
import {Mascot, type MascotMood} from '../../ui/Mascot';
import {MathText} from '../../ui/MathText';
import {CheckCard, Wellbeing} from './CheckCard';
import {FeedbackControl, type Feedback} from './FeedbackControl';
import {StageView} from './StageView';

const BADGES: Record<string, {icon: IconName; label: MessageDescriptor; hint: MessageDescriptor}> = {
  course: {icon: 'book', label: msg`Ton cours`, hint: msg`Réponse appuyée sur ton manuel`},
  general: {icon: 'compass', label: msg`Hors programme`, hint: msg`Réponse générale, hors de ton programme`},
  not_found: {icon: 'not-found', label: msg`Pas dans ton cours`, hint: msg`Je n’ai pas trouvé ce point dans ton manuel`},
  clarify: {icon: 'question', label: msg`Je précise ta question`, hint: msg`Une question pour mieux t’aider`},
  excerpt: {icon: 'quote', label: msg`Extrait du manuel`, hint: msg`Passage de ton manuel, sans IA`},
};

const styles = stylex.create({
  student: {margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minInlineSize: 0},
  kicker: {
    display: 'block',
    marginBlockEnd: en.space1,
    fontSize: en.typeMicroSize,
    lineHeight: en.typeMicroLeading,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  reply: {display: 'grid', gap: en.space3, minInlineSize: 0},
  card: {
    display: 'grid',
    gap: en.space3,
    minInlineSize: 0,
    padding: {default: en.space4, '@media (width < 640px)': en.space3},
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusLg,
    backgroundColor: en.surface,
    color: en.ink,
    fontFamily: en.fontText,
  },
  head: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: `${en.space1} ${en.space3}`},
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: en.space1,
    paddingBlock: 2,
    paddingInline: en.space2,
    borderRadius: en.radiusSm,
    backgroundColor: en.faienceSoft,
    color: en.ink,
    fontSize: en.typeLabelSize,
    lineHeight: en.typeLabelLeading,
    fontWeight: 600,
  },
  ai: {color: en.inkMuted, fontSize: en.typeMicroSize, lineHeight: en.typeMicroLeading},
  body: {
    display: 'grid',
    gap: en.space3,
    minInlineSize: 0,
    overflowWrap: 'anywhere',
    fontSize: en.typeBodyLgSize,
    lineHeight: en.typeBodyLgLeading,
  },
  block: {margin: 0, whiteSpace: 'pre-line'},
  heading: {
    margin: 0,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: en.typeHeadingWeight,
  },
  list: {margin: 0, paddingInlineStart: en.space6, display: 'grid', gap: en.space1},
  code: {
    margin: 0,
    padding: en.space3,
    overflowX: 'auto',
    borderRadius: en.radiusMd,
    backgroundColor: en.surfaceSunken,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: en.typeCaptionSize,
    lineHeight: en.typeBodyLeading,
    direction: 'ltr',
    textAlign: 'start',
  },
  inlineCode: {fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.92em', direction: 'ltr', unicodeBidi: 'isolate'},
  sources: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: en.space2, minInlineSize: 0},
  sourcesLabel: {color: en.inkMuted, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  foot: {paddingBlockStart: en.space3, borderBlockStartWidth: 1, borderBlockStartStyle: 'solid', borderBlockStartColor: en.line},
});

function Inline({text}: {text: string}): React.JSX.Element {
  return (
    <>
      {answerInline(text).map((part, index) =>
        part.kind === 'code' ? (
          <code key={index} {...stylex.props(styles.inlineCode)}>
            {part.text}
          </code>
        ) : part.kind === 'strong' ? (
          <strong key={index}>
            <MathText text={part.text} />
          </strong>
        ) : (
          <MathText key={index} text={part.text} />
        ),
      )}
    </>
  );
}

/** Model output as text and maths only; it never becomes HTML. */
export function AnswerBody({text}: {text: string}): React.JSX.Element {
  return (
    <div dir="auto" {...stylex.props(styles.body)}>
      {answerBlocks(text).map((block, index) => {
        if (block.kind === 'code') {
          return (
            <pre key={index} tabIndex={0} {...stylex.props(styles.code)}>
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.kind === 'list') {
          const List = block.ordered ? 'ol' : 'ul';
          return (
            <List key={index} {...stylex.props(styles.list)}>
              {block.items.map((item, at) => (
                <li key={at}>
                  <Inline text={item} />
                </li>
              ))}
            </List>
          );
        }
        return block.kind === 'heading' ? (
          <h3 key={index} {...stylex.props(styles.heading)}>
            <Inline text={block.text} />
          </h3>
        ) : (
          <p key={index} {...stylex.props(styles.block)}>
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

/** The store's failure text, in the learner's language; the busy message carries a number. */
export function useFailureText(): (text: string | null | undefined) => string {
  const {t} = useLingui();
  const serverText = useServerText();
  return text => {
    const value = text ?? '';
    const busy = /^Le tuteur est occupé\. Réessaie dans (\d+) s\.$/.exec(value);
    if (busy) {
      const seconds = busy[1];
      return t`Le tuteur est occupé. Réessaie dans ${seconds} s.`;
    }
    return serverText(value);
  };
}

export interface AnswerMessageProps {
  result: ChatResult;
  onFeedback: (value: Feedback) => Promise<void>;
  /** The chapter a correct guided attempt sets as a tile. */
  tileLabel: string;
}

// An answer glazes its tile once; coming back to the conversation shows it already set.
const settled = new WeakSet<object>();

/** One finished answer: what kind it is, the text, where it comes from, how it went, and "Utile ?". */
export function AnswerMessage({result, onFeedback, tileLabel}: AnswerMessageProps): React.JSX.Element {
  const {i18n, t} = useLingui();
  const [glazeTile] = useState(() => !settled.has(result));
  useEffect(() => {
    settled.add(result);
  }, [result]);
  const serverText = useServerText();
  const kind = result.badge === 'course_excerpt' ? 'excerpt' : (result.badge ?? 'clarify');
  const aiLabel = serverText(result.label || 'réponse générée par IA');

  const reply =
    kind === 'wellbeing' ? (
      <Wellbeing aiLabel={result.ai_generated ? aiLabel : undefined}>
        <AnswerBody text={result.answer} />
      </Wellbeing>
    ) : (
      <article {...stylex.props(styles.card)}>
        <header {...stylex.props(styles.head)}>
          {(() => {
            const badge = BADGES[kind] ?? BADGES.clarify;
            return badge ? (
              <span title={i18n._(badge.hint)} {...stylex.props(styles.badge)}>
                <Icon name={badge.icon} size={16} />
                {i18n._(badge.label)}
              </span>
            ) : null;
          })()}
          <span {...stylex.props(styles.ai)}>{result.ai_generated ? aiLabel : t`sans IA`}</span>
        </header>
        <AnswerBody text={result.answer} />
        {result.sources.length > 0 && (
          <div {...stylex.props(styles.sources)}>
            <span {...stylex.props(styles.sourcesLabel)}>{t`Sources`}</span>
            {result.sources.map((source, index) => {
              const page = source.page ?? serverText('non précisée');
              return <Citation key={`${source.chunk_id}-${index}`} number={index + 1} source={{title: `${source.source}, ${t`p. ${page}`}`}} />;
            })}
          </div>
        )}
        <footer {...stylex.props(styles.foot)}>
          <FeedbackControl onSubmit={onFeedback} />
        </footer>
      </article>
    );

  return (
    <div {...stylex.props(styles.reply)}>
      {reply}
      {result.attempt_result && <CheckCard value={result.attempt_result} context="attempt" tile={{label: tileLabel, glaze: glazeTile}} />}
    </div>
  );
}

export interface TurnViewProps {
  turn: Turn;
  /** Only the last turn can be retried. */
  last: boolean;
  onRetry: () => void;
  onFeedback: (responseId: string, value: Feedback) => Promise<void>;
  tileLabelFor: (topic: string | null) => string;
}

/** One exchange: the learner's message, then Nova's working, failure or answer. */
export function TurnView({turn, last, onRetry, onFeedback, tileLabelFor}: TurnViewProps): React.JSX.Element {
  const {t} = useLingui();
  const failureText = useFailureText();
  const attempt = turn.action === 'attempt';
  const phone = useMediaQuery('(width < 640px)');
  const verdict = turn.result?.attempt_result?.verdict;
  const mood: MascotMood = verdict === 'correct' ? 'cheer' : verdict === 'incorrect' ? 'encourage' : 'idle';
  return (
    <Fragment>
      <ChatMessage sender="user">
        <ChatMessageBubble>
          <p translate="no" {...stylex.props(styles.student)}>
            {attempt && <span {...stylex.props(styles.kicker)}>{t`Ma réponse`}</span>}
            <MathText text={turn.message} />
          </p>
        </ChatMessageBubble>
      </ChatMessage>
      <ChatMessage sender="assistant" avatar={<Mascot mood={mood} size={phone ? 28 : 32} />}>
        <ChatMessageBubble variant="ghost" width="100%">
          {turn.status === 'pending' && <StageView stage={turn.stage} />}
          {turn.status === 'failed' && <ErrorBanner message={failureText(turn.error)} onRetry={last ? onRetry : undefined} />}
          {turn.status === 'complete' && turn.result && (
            <AnswerMessage
              result={turn.result}
              onFeedback={value => onFeedback(turn.result?.response_id ?? '', value)}
              tileLabel={tileLabelFor(turn.result.topic)}
            />
          )}
        </ChatMessageBubble>
      </ChatMessage>
    </Fragment>
  );
}
