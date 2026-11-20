import * as stylex from '@stylexjs/stylex';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {Trans, useLingui} from '@lingui/react/macro';
import {lazy, Suspense, useMemo} from 'react';
import {useSession, useStore} from '../../app/session';
import {useServerText} from '../../i18n/serverText';
import {subjects, type Thread} from '../../lib/tutor-workspace';
import {en} from '../../theme/ednova.stylex';
import {ScreenTitle} from '../ScreenTitle';
import {useTopicCatalog} from '../accueil/queries';
import type {Feedback} from './FeedbackControl';
import {ThreadList, type ThreadEntry} from './ThreadList';

// The chat pulls in the composer, the selectors and KaTeX: the title and the conversations show first.
const Conversation = lazy(() => import('./Conversation').then(module => ({default: module.Conversation})));

const styles = stylex.create({
  layout: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 15rem) minmax(0, 1fr)', '@media (width < 880px)': 'minmax(0, 1fr)'},
    alignItems: 'start',
    gap: {default: en.space6, '@media (width < 880px)': en.space3},
    minInlineSize: 0,
  },
  pending: {blockSize: 'max(30rem, calc(100dvh - 12.5rem))', borderRadius: en.radiusLg},
});

const firstQuestion = (thread: Thread): string => {
  const first = thread.turns[0]?.message.replace(/\s+/g, ' ') ?? '';
  return first.length > 52 ? `${first.slice(0, 51)}…` : first;
};

export function Component(): React.JSX.Element {
  const {api, tutor} = useSession();
  const state = useStore(tutor);
  const {t} = useLingui();
  const serverText = useServerText();
  const catalog = useTopicCatalog();
  const thread = state.threads.find(item => item.id === state.activeId) ?? (state.threads[0] as Thread);

  const entries: ThreadEntry[] = useMemo(
    () =>
      state.threads.map(item => ({
        id: item.id,
        subject: Object.hasOwn(subjects, item.subject) ? serverText(subjects[item.subject as keyof typeof subjects].label) : t`Sans matière`,
        title: item.turns.length ? firstQuestion(item) : t`Nouvelle conversation`,
        typed: item.turns.length > 0,
      })),
    [state.threads, serverText, t],
  );

  const tileLabelFor = (topic: string | null): string => {
    const found = topic ? catalog.data?.topics?.find(item => item.slug === topic) : undefined;
    return found ? serverText(found.label) : t`Juste`;
  };
  const sendFeedback = async (responseId: string, value: Feedback): Promise<void> => {
    await api.request('POST', '/tutor/feedback', {json: {...value, response_id: responseId}});
  };

  return (
    <>
      <ScreenTitle>
        <Trans>Tuteur</Trans>
      </ScreenTitle>
      <div {...stylex.props(styles.layout)}>
        <ThreadList threads={entries} activeId={thread.id} onSelect={id => tutor.select(id)} onNew={() => void tutor.newThread()} />
        <Suspense fallback={<Skeleton xstyle={styles.pending} />}>
          <Conversation key={thread.id} thread={thread} onFeedback={sendFeedback} tileLabelFor={tileLabelFor} />
        </Suspense>
      </div>
    </>
  );
}
