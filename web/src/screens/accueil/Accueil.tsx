import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {useLingui} from '@lingui/react/macro';
import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router';
import {useSession, useStore} from '../../app/session';
import {useServerText} from '../../i18n/serverText';
import type {Thread} from '../../lib/tutor-workspace';
import {en} from '../../theme/ednova.stylex';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Icon} from '../../ui/icons';
import {tutorPrompt} from '../../i18n/prompts';
import {PlansSection} from '../plans/PlansSection';
import {HomeOverview, type HomeSummary} from './HomeOverview';
import {buildChapters, useLearningProgress, useProfile, useTopicCatalog, weakestChapter, type Chapter} from './queries';

const styles = stylex.create({
  tools: {display: 'flex', flexWrap: 'wrap', gap: en.space2},
});

/** The first question of a thread, on one line; the old tutor list's title. */
const threadTitle = (thread: Thread): string => {
  const first = thread.turns[0]?.message.replace(/\s+/g, ' ') ?? '';
  return first.length > 52 ? `${first.slice(0, 51)}…` : first;
};

export function Component(): React.JSX.Element {
  const {pseudo, timer, tutor} = useSession();
  const navigate = useNavigate();
  const {t, i18n} = useLingui();
  const serverText = useServerText();
  const timerState = useStore(timer);
  const tutorState = useStore(tutor);
  const profile = useProfile();
  const catalog = useTopicCatalog();
  const progress = useLearningProgress();
  const [picked, setPicked] = useState<string | null>(null);

  // Keeps the floating timer honest about a session started elsewhere, as the old home did.
  useEffect(() => void timer.refresh(), [timer]);

  const chapters = useMemo(
    () => (catalog.data && progress.data ? buildChapters(catalog.data, progress.data) : null),
    [catalog.data, progress.data],
  );
  const weakest = useMemo(() => (chapters ? weakestChapter(chapters) : null), [chapters]);
  const selectedId = picked ?? weakest?.id ?? null;

  const loadFailed = t`Chargement indisponible. Réessaie.`;
  const chaptersError =
    catalog.isError || progress.isError
      ? {
          message: loadFailed,
          onRetry: () => {
            if (catalog.isError) void catalog.refetch();
            if (progress.isError) void progress.refetch();
          },
        }
      : undefined;

  const raw = timerState.summary;
  const summary: HomeSummary | null = raw
    ? {todayMinutes: raw.minutes_today ?? 0, weekMinutes: raw.minutes_week ?? 0, streakDays: raw.streak_days ?? 0}
    : null;
  const summaryError = !raw && timerState.error && !timerState.busy ? {message: loadFailed, onRetry: () => void timer.refresh()} : undefined;

  const practise = (chapter: Chapter) => {
    const id = tutor.newThread({subject: 'math', mode: 'guided'});
    void navigate('/tuteur');
    const message = tutorPrompt('exercise', i18n.locale, serverText(chapter.label));
    void tutor.send(id, message, 'new_question');
  };

  const recent = tutorState.threads.find(thread => thread.id === tutorState.recentId);
  const presentation = profile.data?.presentation;
  const style = presentation === 'visual' ? t`Visuel` : presentation === 'reading' ? t`Lecture` : null;
  const kept = profile.data?.enabled_tools ?? [];
  const tools = kept.filter(tool => tool === 'guided' || tool === 'feynman');

  return (
    <>
      {profile.isError && <ErrorBanner message={loadFailed} onRetry={() => void profile.refetch()} />}
      <HomeOverview
        pseudo={pseudo ?? ''}
        aside={style ? t`Présentation : ${style}` : undefined}
        chapters={chaptersError ? [] : chapters}
        chaptersError={chaptersError}
        translateLabel={serverText}
        selectedId={selectedId}
        weakestId={weakest?.id ?? null}
        onSelect={setPicked}
        onPractise={practise}
        onAsk={() => void navigate('/tuteur')}
        summary={summary}
        summaryError={summaryError}
        sessionRunning={timerState.phase === 'running'}
        onStartSession={() => void navigate('/seances')}
        lastSession={
          recent
            ? {
                topic: threadTitle(recent),
                onOpen: () => {
                  tutor.select(recent.id);
                  void navigate('/tuteur');
                },
              }
            : undefined
        }
        tools={
          tools.length > 0 ? (
            <div {...stylex.props(styles.tools)}>
              {tools.includes('guided') && (
                <Button
                  variant="secondary"
                  label={t`Exercices guidés`}
                  icon={<Icon name="stairs" size={20} />}
                  onClick={() => {
                    tutor.newThread({mode: 'guided'});
                    void navigate('/tuteur');
                  }}
                />
              )}
              {tools.includes('feynman') && (
                <Button
                  variant="secondary"
                  label={t`Vérifier une explication`}
                  icon={<Icon name="review" size={20} />}
                  href="/salle"
                />
              )}
            </div>
          ) : undefined
        }
      />
      <PlansSection />
    </>
  );
}
