import * as stylex from '@stylexjs/stylex';
import {Button} from '@astryxdesign/core/Button';
import {Citation} from '@astryxdesign/core/Citation';
import {Trans, useLingui} from '@lingui/react/macro';
import {useMutation} from '@tanstack/react-query';
import {useEffect, useId, useRef, useState} from 'react';
import {useSession} from '../../app/session';
import {useServerText} from '../../i18n/serverText';
import type {ApiError, Source} from '../../lib/types';
import {en} from '../../theme/ednova.stylex';
import {Mascot} from '../../ui/Mascot';
import {MathText} from '../../ui/MathText';
import {LockedNotice} from '../plans/LockedNotice';
import {usePlan} from '../plans/queries';
import {studyStyles} from './studyFeatureStyles';

interface Pack {
  topic: 'derivabilite';
  sheet: {text: string; source: Source}[];
  cards: {question: string; answer: string; source: Source}[];
}

const styles = stylex.create({
  cards: {display: 'grid', gap: en.space2},
  card: {padding: en.space3, backgroundColor: en.surfaceSunken, borderRadius: en.radiusMd, color: en.ink},
  summary: {cursor: 'pointer', fontWeight: 600},
  answer: {marginBlock: en.space2, marginInline: 0, lineHeight: en.typeBodyLeading},
  sources: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: en.space2, minInlineSize: 0},
  nova: {display: 'flex', alignItems: 'center', gap: en.space3, minInlineSize: 0},
});

/** A source rendered like the tutor's: a numbered citation with the book and the page. */
function Sources({sources, first = 1}: {sources: Source[]; first?: number}): React.JSX.Element {
  const {t} = useLingui();
  const serverText = useServerText();
  return (
    <div {...stylex.props(styles.sources)}>
      {sources.map((source, index) => {
        const page = source.page ?? serverText('non précisée');
        return <Citation key={`${source.chunk_id}-${index}`} number={first + index} source={{title: `${source.source}, ${t`p. ${page}`}`}} />;
      })}
    </div>
  );
}

interface RecallCardProps {
  question: string;
  answer: string;
  source?: Source;
  number?: number;
  onReveal?: () => void;
}

function RecallCard({question, answer, source, number, onReveal}: RecallCardProps) {
  return (
    <details
      dir="auto"
      {...stylex.props(styles.card)}
      onToggle={event => {
        if (event.currentTarget.open) onReveal?.();
      }}>
      <summary {...stylex.props(styles.summary)}>
        <MathText text={question} />
      </summary>
      <p {...stylex.props(styles.answer)}>
        <MathText text={answer} />
      </p>
      {source && <Sources sources={[source]} first={number} />}
    </details>
  );
}

export interface RevisionPackProps {
  onClose: () => void;
}

/** Free: one fixed recall card. Pro: Nova's cited sheet and three recall cards on Dérivabilité (a pilot course). */
export function RevisionPack({onClose}: RevisionPackProps): React.JSX.Element {
  const {api} = useSession();
  const {t} = useLingui();
  const {plan} = usePlan();
  const heading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const demoSent = useRef(false);
  const [waiting, setWaiting] = useState(false);
  const pack = useMutation({
    mutationFn: () => api.request<Pack>('POST', '/learning/revision-pack/derivabilite'),
    onError: error => {
      const seconds = (error as ApiError).retryAfter ?? 0;
      if ((error as ApiError).status === 503 && seconds > 0) setWaiting(true);
    },
  });
  const error = pack.error as ApiError | null;
  const free = plan === 'free' || error?.code === 'pro_required';

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    if (!waiting) return;
    const handle = setTimeout(() => setWaiting(false), Math.max(1, (error?.retryAfter ?? 1)) * 1000);
    return () => clearTimeout(handle);
  }, [waiting, error]);

  const recordDemo = () => {
    if (demoSent.current) return;
    demoSent.current = true;
    api.request('POST', '/learning/revision-demo/completion').catch(() => undefined);
  };

  const seconds = Math.ceil(error?.retryAfter ?? 0);
  const message =
    error?.code === 'not_in_course'
      ? t`Les fiches sont en pilote pour le bac Sciences expérimentales, avec les sources vérifiées.`
      : error?.status === 503
        ? seconds > 0
          ? t`Nova est très sollicitée. Réessaie dans ${seconds} s.`
          : t`Nova est très sollicitée. Réessaie dans quelques instants.`
        : t`La fiche n’a pas pu être préparée. Réessaie.`;

  return (
    <section aria-labelledby={headingId} {...stylex.props(studyStyles.panel)}>
      <h2 id={headingId} ref={heading} tabIndex={-1} {...stylex.props(studyStyles.heading)}>
        <Trans>Fiches de révision Nova : Dérivabilité</Trans>
      </h2>
      {pack.data ? (
        <>
          <div {...stylex.props(studyStyles.stack)}>
            <h3 {...stylex.props(studyStyles.subheading)}>
              <Trans>Fiche</Trans>
            </h3>
            {pack.data.sheet.map((point, index) => (
              <div key={index} dir="auto" {...stylex.props(studyStyles.stack)}>
                <p translate="no" {...stylex.props(studyStyles.text)}>
                  <MathText text={point.text} />
                </p>
                <Sources sources={[point.source]} first={index + 1} />
              </div>
            ))}
          </div>
          <div {...stylex.props(studyStyles.stack)}>
            <h3 {...stylex.props(studyStyles.subheading)}>
              <Trans>Cartes de rappel</Trans>
            </h3>
            <div {...stylex.props(styles.cards)}>
              {pack.data.cards.map((card, index) => (
                <RecallCard key={index} {...card} number={pack.data.sheet.length + index + 1} />
              ))}
            </div>
          </div>
          <p {...stylex.props(studyStyles.muted)}>
            <Trans>Fiche générée par l’IA : vérifie-la avec ton cours.</Trans>
          </p>
        </>
      ) : (
        <>
          {free && (
            <>
              <h3 {...stylex.props(studyStyles.subheading)}>
                <Trans>Carte d’exemple</Trans>
              </h3>
              <p {...stylex.props(studyStyles.text)}>
                <Trans>Touche la question pour voir la réponse.</Trans>
              </p>
              <RecallCard
                question={t`Quelle est la dérivée de $f(x)=x^2$ ?`}
                answer={t`La règle des puissances donne $f′(x)=2x$.`}
                onReveal={recordDemo}
              />
              <LockedNotice
                title={t`Fiches de révision Nova`}
                reason={t`La fiche citée et les trois cartes de rappel sur la dérivabilité sont réservées à l’offre Pro.`}
              />
            </>
          )}
          {!free && (
            <>
              <p {...stylex.props(studyStyles.text)}>
                <Trans>Nova prépare une fiche avec ses sources et trois cartes de rappel. Cela peut prendre un moment.</Trans>
              </p>
              {pack.isPending && (
                <div {...stylex.props(styles.nova)}>
                  <Mascot mood="thinking" size={56} />
                  <p role="status" {...stylex.props(studyStyles.muted)}>
                    <Trans>Nova prépare ta fiche…</Trans>
                  </p>
                </div>
              )}
              {pack.isError && (
                <p role="alert" {...stylex.props(studyStyles.text)}>
                  {message}
                </p>
              )}
              {error?.code !== 'not_in_course' && (
                <div>
                  <Button
                    variant="primary"
                    label={pack.isError ? t`Réessayer` : t`Générer ma fiche`}
                    isLoading={pack.isPending}
                    isDisabled={pack.isPending || waiting}
                    onClick={() => pack.mutate()}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
      <div>
        <Button variant="ghost" label={t`Fermer la fiche`} onClick={onClose} />
      </div>
    </section>
  );
}
