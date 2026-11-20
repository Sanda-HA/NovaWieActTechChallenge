import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Heading} from '@astryxdesign/core/Heading';
import {Selector} from '@astryxdesign/core/Selector';
import {Trans, useLingui} from '@lingui/react/macro';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router';
import {useSession} from '../../app/session';
import {useServerText} from '../../i18n/serverText';
import {isProRequired} from '../../lib/plans';
import {subjects} from '../../lib/tutor-workspace';
import type {MistakePractice} from '../../lib/types';
import {en} from '../../theme/ednova.stylex';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Mascot} from '../../ui/Mascot';
import {LockedNotice} from '../plans/LockedNotice';
import {ProMark} from '../plans/PlanBadge';
import {usePlan} from '../plans/queries';
import {ChapterMap} from './ChapterMap';
import {ChapterPanel} from './ChapterPanel';
import {GroupReview} from './GroupReview';
import {tutorPrompt} from '../../i18n/prompts';
import {InteractiveLab, type LabTopic} from './InteractiveLab';
import {MasteryRow} from './MasteryRow';
import {MindMaps} from './MindMaps';
import {QuizPanel} from './QuizPanel';
import {RevisionPack} from './RevisionPack';
import {buildMap, REVISION_TOPICS, useLearningProgress, useTopicCatalog, type MapChapter} from './queries';

const styles = stylex.create({
  page: {display: 'grid', gap: {default: en.space8, '@media (width < 640px)': en.space6}, minInlineSize: 0},
  head: {display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: en.space4},
  lead: {display: 'flex', alignItems: 'center', gap: en.space3, minInlineSize: 0},
  hello: {display: 'grid', gap: en.space2, minInlineSize: 0},
  sub: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodyLgSize, lineHeight: en.typeBodyLgLeading},
  subject: {minInlineSize: {default: '14rem', '@media (width < 640px)': 0}, inlineSize: {default: 'auto', '@media (width < 640px)': '100%'}},
  card: {
    display: 'grid',
    gap: en.space6,
    minInlineSize: 0,
    padding: {default: en.space6, '@media (width < 640px)': en.space4},
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusXl,
    backgroundColor: en.surface,
    boxShadow: en.shadowRaise,
  },
  board: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 1100px)': 'minmax(0, 1fr) 20rem'},
    alignItems: 'start',
    gap: en.space6,
    minInlineSize: 0,
  },
  sectionTitle: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: en.typeHeadingWeight,
  },
  text: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  strong: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, fontWeight: 700},
  mistakes: {display: 'grid', gap: en.space2, inlineSize: '100%', margin: 0, padding: 0, listStyle: 'none'},
  mistake: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: `${en.space2} ${en.space4}`,
    minInlineSize: 0,
    paddingBlock: en.space3,
    paddingInline: en.space4,
    borderRadius: en.radiusMd,
    backgroundColor: en.surfaceSunken,
  },
  mistakeText: {display: 'grid', gap: 2, minInlineSize: 0, overflowWrap: 'anywhere'},
  detail: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 900px)': 'repeat(2, minmax(0, 1fr))'},
    inlineSize: '100%',
    columnGap: en.space8,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  detailItem: {
    display: 'grid',
    alignContent: 'start',
    minInlineSize: 0,
    borderBlockStartWidth: 1,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: en.line,
  },
  detailSubs: {display: 'grid', margin: 0, padding: 0, listStyle: 'none'},
  revise: {display: 'grid', gap: en.space3, justifyItems: 'start'},
  row: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: en.space2},
  tools: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 900px)': 'repeat(3, minmax(0, 1fr))'},
    gap: en.space4,
    inlineSize: '100%',
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  tool: {
    display: 'grid',
    alignContent: 'start',
    justifyItems: 'start',
    gap: en.space3,
    minInlineSize: 0,
    padding: en.space4,
    borderRadius: en.radiusLg,
    backgroundColor: en.surfaceSunken,
  },
  toolTitle: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodyLgSize, lineHeight: en.typeBodyLgLeading, fontWeight: 700},
  toolLocked: {inlineSize: '100%'},
});

type Tool = 'lab' | 'pack' | 'bac';
type Activity = 'sample' | 'quiz' | 'lab' | 'revision' | 'timed';
const DERIVABILITE = 'derivabilite';

function useActivityUrl(subject?: string) {
  const [params, setParams] = useSearchParams();
  const activity = params.get('activity');
  const value = params.get('topic');
  const topic = value && /^[a-z0-9_]{1,40}$/.test(value) ? value : null;
  const setActivity = (next: Activity | null, slug?: string) => {
    const updated = new URLSearchParams(params);
    if (subject) updated.set('subject', subject);
    if (next) updated.set('activity', next);
    else updated.delete('activity');
    if (slug) updated.set('topic', slug);
    else updated.delete('topic');
    setParams(updated, {replace: next === null || next === activity});
  };
  return {activity, topic, setActivity};
}

const MISTAKE_KINDS = {
  concept: <Trans>Notion</Trans>,
  calculation: <Trans>Calcul</Trans>,
  notation: <Trans>Notation</Trans>,
  incomplete: <Trans>Réponse incomplète</Trans>,
} as const;

function MathMap(): React.JSX.Element {
  const {api, tutor} = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation() as ReturnType<typeof useLocation> & {state: {sample?: boolean} | null};
  const {activity, topic, setActivity} = useActivityUrl();
  const handledActivity = useRef<string | null>(null);
  const {plan} = usePlan();
  const {t, i18n} = useLingui();
  const serverText = useServerText();
  const catalog = useTopicCatalog();
  const progress = useLearningProgress();
  const [openId, setOpenId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [sampleOpen, setSampleOpen] = useState(location.state?.sample === true || activity === 'sample');
  const [tool, setTool] = useState<Tool | null>(null);
  const panel = useRef<HTMLElement>(null);
  const detailTitle = useId();
  const mistakesTitle = useId();

  useEffect(() => {
    // Keep an open quiz mounted when the plan refreshes during a timed attempt.
    if (!plan || handledActivity.current === location.key) return;
    handledActivity.current = location.key;
    setSampleOpen(activity === 'sample' || location.state?.sample === true);
    setQuizId(activity === 'quiz' && plan === 'pro' ? topic ?? DERIVABILITE : null);
    setTool(activity === 'revision' ? 'pack' :
      plan === 'pro' && activity === 'timed' ? 'bac' :
      plan === 'pro' && activity === 'lab' ? 'lab' : null);
  }, [activity, location.key, location.state, plan, topic]);

  const chapters = useMemo(() => (catalog.data && progress.data ? buildMap(catalog.data, progress.data) : null), [catalog.data, progress.data]);
  const mistakes = progress.data?.mistakes ?? [];
  const labTopics: LabTopic[] = [...(catalog.data?.topics ?? []), ...(catalog.data?.subtopics ?? [])].map(({slug, label}) => ({slug, label}));
  const bacLabel = serverText(catalog.data?.topics?.find(item => item.slug === DERIVABILITE)?.label ?? 'Dérivabilité');
  const open = chapters?.find(chapter => chapter.id === openId) ?? null;
  const quizChapter = chapters?.find(chapter => chapter.id === quizId) ?? null;

  const error =
    catalog.isError || progress.isError
      ? {
          message: t`Chargement indisponible. Réessaie.`,
          onRetry: () => {
            if (catalog.isError) void catalog.refetch();
            if (progress.isError) void progress.refetch();
          },
        }
      : undefined;

  const pick = (id: string) => {
    setOpenId(id);
    if (quizId) setActivity(null);
    // On a phone the chapter sits under the map: bring it into view.
    requestAnimationFrame(() => {
      const box = panel.current?.getBoundingClientRect();
      if (!box || (box.top >= 0 && box.bottom <= window.innerHeight)) return;
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      panel.current?.scrollIntoView({block: 'nearest', behavior: still ? 'auto' : 'smooth'});
    });
  };

  const practise = (label: string) => {
    const id = tutor.newThread({subject: 'math', mode: 'guided'});
    void navigate('/tuteur');
    void tutor.send(id, tutorPrompt('exercise', i18n.locale, serverText(label)), 'new_question');
  };
  const practiseMistake = useMutation({
    mutationFn: (row: {topic: string; type: string}) => api.request<MistakePractice>('POST', '/learning/mistake-practice', {json: row}),
    onSuccess: practice => {
      const id = tutor.newThread({subject: 'math', mode: 'guided', sessionId: practice.session_id});
      void navigate('/tuteur');
      void tutor.send(id, practice.message, 'new_question');
    },
    onError: error => {
      if ((error as {code?: string}).code === 'mistake_not_found') void queryClient.invalidateQueries({queryKey: ['learning-progress']});
    },
  });
  const practiseError = practiseMistake.error as {code?: string} | null;
  const mistakesLocked = plan === 'free' || (practiseMistake.isError && isProRequired(practiseError));
  const knownTopics = new Set((catalog.data?.topics ?? []).map(topic => topic.slug));
  const mistakeKind = (type: string) => (type in MISTAKE_KINDS ? MISTAKE_KINDS[type as keyof typeof MISTAKE_KINDS] : type);

  return (
    <>
      <section aria-label={t`Carte des chapitres`} {...stylex.props(styles.card)}>
        <div {...stylex.props(styles.board)}>
          <ChapterMap chapters={error ? [] : chapters} error={error} translateLabel={serverText} openId={openId} onOpen={pick} />
          <ChapterPanel
            ref={panel}
            chapter={open}
            translateLabel={serverText}
            quizOpen={quizChapter !== null}
            quizLocked={plan === 'free'}
            onQuiz={() => setActivity('quiz', open?.id)}
            onLab={plan === 'pro' && open ? () => setActivity('lab', open.id) : undefined}
            onPractise={(chapter: MapChapter) => practise(chapter.label)}
          />
        </div>
      </section>

      <section aria-label={t`Quiz d’exemple`} {...stylex.props(styles.revise)}>
        {sampleOpen ? (
          <QuizPanel topic="derivabilite" label={t`Quiz d’exemple`} sample onClose={() => setActivity(null)} />
        ) : (
          <>
            <h2 {...stylex.props(styles.sectionTitle)}>
              <Trans>Quiz d’exemple</Trans>
            </h2>
            <p {...stylex.props(styles.text)}>
              <Trans>Une question sur la dérivation, avec sa correction. Ouvert à tous, à refaire à tout moment.</Trans>
            </p>
            <Button
              variant="secondary"
              label={t`Essayer le quiz d’exemple`}
              onClick={() => setActivity('sample')}
            />
          </>
        )}
      </section>

      <section aria-label={t`Outils de révision`} {...stylex.props(styles.revise)}>
        <h2 {...stylex.props(styles.sectionTitle)}>
          <Trans>Outils de révision</Trans>
        </h2>
        <ul {...stylex.props(styles.tools)}>
          <li {...stylex.props(styles.tool)}>
            <h3 {...stylex.props(styles.toolTitle)}>
              <Trans>Labo interactif</Trans>
            </h3>
            <p {...stylex.props(styles.text)}>
              <Trans>Déplace le curseur, prédis le résultat, puis compare avec le graphique.</Trans>
            </p>
            {plan === 'free' ? (
              <div {...stylex.props(styles.toolLocked)}>
                <LockedNotice title={t`Labo interactif`} reason={t`Le labo interactif est réservé à l’offre Pro.`} hideLink />
              </div>
            ) : (
              <Button variant="secondary" label={t`Ouvrir le labo`} isDisabled={plan === null} onClick={() => setActivity('lab')} />
            )}
          </li>
          <li {...stylex.props(styles.tool)}>
            <h3 {...stylex.props(styles.toolTitle)}>
              <Trans>Fiches de révision Nova</Trans>
            </h3>
            <p {...stylex.props(styles.text)}>
              {plan === 'pro' ? (
                <Trans>Une fiche citée et trois cartes de rappel sur la dérivabilité.</Trans>
              ) : (
                <Trans>Essaie une carte de rappel gratuite. La fiche complète est en Pro.</Trans>
              )}
            </p>
            <Button variant="secondary" label={plan === 'pro' ? t`Préparer ma fiche` : t`Essayer une carte`} onClick={() => setActivity('revision')} />
          </li>
          <li {...stylex.props(styles.tool)}>
            <h3 {...stylex.props(styles.toolTitle)}>
              <Trans>Entraînement Bac chronométré</Trans>
            </h3>
            <p {...stylex.props(styles.text)}>
              <Trans>Cinq questions de dérivabilité en dix minutes, avec le score et les corrections.</Trans>
            </p>
            {plan === 'free' ? (
              <div {...stylex.props(styles.toolLocked)}>
                <LockedNotice title={t`Entraînement Bac chronométré`} reason={t`L’entraînement Bac chronométré est réservé à l’offre Pro.`} hideLink />
              </div>
            ) : (
              <Button variant="secondary" label={t`Commencer l’entraînement`} isDisabled={plan === null} onClick={() => setActivity('timed')} />
            )}
          </li>
        </ul>
      </section>

      {tool === 'lab' && <InteractiveLab topic={topic ?? DERIVABILITE} topics={labTopics} onTopic={slug => setActivity('lab', slug)} onClose={() => setActivity(null)} />}
      {tool === 'pack' && <RevisionPack onClose={() => setActivity(null)} />}
      {tool === 'bac' && (
        <QuizPanel topic={DERIVABILITE} label={bacLabel} timed canRestart={plan === 'pro'}
          onReview={() => setActivity('revision')} onClose={() => setActivity(null)} />
      )}

      {quizChapter && <QuizPanel key={quizChapter.id} topic={quizChapter.id} label={serverText(quizChapter.label)} onClose={() => setActivity(null)} />}

      {mistakes.length > 0 && (
        <section aria-labelledby={mistakesTitle} {...stylex.props(styles.revise)}>
          <h2 id={mistakesTitle} {...stylex.props(styles.sectionTitle)}>
            <Trans>À retravailler</Trans>
            {mistakesLocked && <ProMark />}
          </h2>
          {mistakesLocked && (
            <LockedNotice
              title={t`Retravailler une erreur`}
              reason={t`Lancer un exercice depuis une erreur repérée est réservé à l’offre Pro. Ta liste d’erreurs reste visible.`}
            />
          )}
          {practiseMistake.isError && !isProRequired(practiseError) && (
            <ErrorBanner
              message={
                practiseError?.code === 'mistake_not_found'
                  ? t`Cette erreur ne figure plus dans ta progression.`
                  : t`Impossible de lancer l’exercice. Réessaie.`
              }
            />
          )}
          <ul {...stylex.props(styles.mistakes)}>
            {mistakes.map(row => (
              <li key={row.topic + row.type} {...stylex.props(styles.mistake)}>
                <div {...stylex.props(styles.mistakeText)}>
                  <strong {...stylex.props(styles.strong)}>{serverText(row.label)}</strong>
                  <span {...stylex.props(styles.text)}>{mistakeKind(row.type)}</span>
                </div>
                {!mistakesLocked && knownTopics.has(row.topic) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    label={t`S’entraîner`}
                    isLoading={
                      practiseMistake.isPending && practiseMistake.variables.topic === row.topic && practiseMistake.variables.type === row.type
                    }
                    isDisabled={practiseMistake.isPending}
                    onClick={() => practiseMistake.mutate({topic: row.topic, type: row.type})}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <GroupReview />

      {chapters && chapters.length > 0 && (
        <section aria-labelledby={detailTitle} {...stylex.props(styles.revise)}>
          <h2 id={detailTitle} {...stylex.props(styles.sectionTitle)}>
            <Trans>Détail par chapitre</Trans>
          </h2>
          <ul {...stylex.props(styles.detail)}>
            {chapters.map(chapter => (
              <li key={chapter.id} {...stylex.props(styles.detailItem)}>
                <ul {...stylex.props(styles.detailSubs)}>
                  <MasteryRow label={serverText(chapter.label)} mastery={chapter.mastery} level={chapter.level} attempts={chapter.attempts} />
                  {chapter.subtopics.map(sub => (
                    <MasteryRow key={sub.id} nested label={serverText(sub.label)} mastery={sub.mastery} level={sub.level} attempts={sub.attempts} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function RevisionHints({subject}: {subject: string}): React.JSX.Element {
  const {tutor} = useSession();
  const {plan} = usePlan();
  const {activity, topic, setActivity} = useActivityUrl(subject);
  const navigate = useNavigate();
  const {t, i18n} = useLingui();
  const serverText = useServerText();
  const titleId = useId();
  const topics = REVISION_TOPICS[subject] ?? [];
  const labTopics: LabTopic[] = topics.map((label, index) => ({slug: `${subject}_${index}`, label}));

  const revise = (topic: string) => {
    const id = tutor.newThread({subject});
    void navigate('/tuteur');
    void tutor.send(id, tutorPrompt('review', i18n.locale, serverText(topic)));
  };

  return (
    <section aria-labelledby={titleId} {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.revise)}>
        <h2 id={titleId} {...stylex.props(styles.sectionTitle)}>
          <Trans>Pistes de révision</Trans>
        </h2>
        <p {...stylex.props(styles.text)}>
          <Trans>Révise ces notions avec Nova. Le suivi par chapitre est disponible en mathématiques.</Trans>
        </p>
        <ul {...stylex.props(styles.mistakes)}>
          {topics.map((item, index) => {
            const topic = serverText(item);
            return (
              <li key={item} {...stylex.props(styles.row)}>
                <Button variant="secondary" label={t`Réviser : ${topic}`} onClick={() => revise(item)} />
                {plan === 'pro' && <Button variant="ghost" label={t`Ouvrir le labo : ${topic}`} onClick={() => setActivity('lab', `${subject}_${index}`)} />}
              </li>
            );
          })}
        </ul>
        {plan === 'free' && (
          <LockedNotice title={t`Labo interactif`} reason={t`Le labo interactif compare des situations de ce cours. Il est réservé à l’offre Pro.`} />
        )}
      </div>
      {activity === 'lab' && plan === 'pro' && labTopics.length > 0 && (
        <InteractiveLab topic={topic ?? `${subject}_0`} topics={labTopics} onTopic={slug => setActivity('lab', slug)} onClose={() => setActivity(null)} />
      )}
    </section>
  );
}

export function Component(): React.JSX.Element {
  const {t} = useLingui();
  const serverText = useServerText();
  const titleId = useId();
  const [search, setSearch] = useSearchParams();
  const {activity, topic, setActivity} = useActivityUrl();
  const {tutor} = useSession();
  const navigate = useNavigate();
  const requestedSubject = search.get('subject');
  const labSubject = activity === 'lab' && topic ? Object.keys(REVISION_TOPICS).find(key => topic.startsWith(`${key}_`)) : undefined;
  const subject = labSubject ?? (requestedSubject && Object.hasOwn(subjects, requestedSubject) ? requestedSubject : 'math');
  const setSubject = (next: string) => {
    const params = new URLSearchParams(search);
    if (next === 'math') params.delete('subject');
    else params.set('subject', next);
    params.delete('mind-map');
    params.delete('activity');
    params.delete('topic');
    setSearch(params, {replace: true});
  };
  const options = Object.entries(subjects).map(([value, {label}]) => ({value, label: serverText(label)}));

  return (
    <section aria-labelledby={titleId} {...stylex.props(styles.page)}>
      <header {...stylex.props(styles.head)}>
        <div {...stylex.props(styles.lead)}>
          <Mascot size={68} />
          <div {...stylex.props(styles.hello)}>
            <Heading level={1} type="display-3" id={titleId}>
              <Trans>Carte des chapitres</Trans>
            </Heading>
            {subject === 'math' && (
              <p {...stylex.props(styles.sub)}>
                <Trans>Catalogue de mathématiques en brouillon</Trans>
              </p>
            )}
          </div>
        </div>
        <div {...stylex.props(styles.subject)}>
          <Selector label={t`Matière`} options={options} value={subject} onChange={setSubject} />
        </div>
      </header>
      <MindMaps
        subject={subject}
        selected={search.get('mind-map') ?? ''}
        onSelect={topic => {
          const params = new URLSearchParams(search);
          if (topic) params.set('mind-map', topic);
          else params.delete('mind-map');
          params.delete('activity');
          params.delete('topic');
          setSearch(params, {replace: true});
        }}
        onAsk={(matter, message) => {
          const thread = tutor.newThread({subject: matter});
          void navigate('/tuteur');
          void tutor.send(thread, message, 'new_question');
        }}
        onRevision={() => setActivity('revision')}
      />
      {subject === 'math' ? <MathMap /> : <RevisionHints key={subject} subject={subject} />}
    </section>
  );
}
