import * as stylex from '@stylexjs/stylex';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {useNavigate} from 'react-router';
import {useServerText} from '../../i18n/serverText';
import {isResult, type DuelResult, type DuelView, type Exam} from '../../lib/duel';
import {en} from '../../theme/ednova.stylex';
import {Mascot} from '../../ui/Mascot';
import {MathText} from '../../ui/MathText';
import {useTopicCatalog} from '../accueil/queries';
import {shared} from '../salle/styles';
import {DuelError} from './DuelError';
import {useDebrief, useDuelResult} from './queries';

const CONCEPTS: Record<string, MessageDescriptor> = {
  derivative_rules: msg`Règles de dérivation`,
  chain_rule: msg`Dérivée d’une composée`,
  product_rule: msg`Dérivée d’un produit`,
  differentiability_at_point: msg`Dérivabilité en un point`,
  tangent_equation: msg`Équation de la tangente`,
};

const humanize = (slug: string): string => {
  const words = slug.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const styles = stylex.create({
  heading: {display: 'flex', alignItems: 'center', gap: en.space3, minInlineSize: 0},
  page: {display: 'grid', gap: en.space4, minInlineSize: 0},
  score: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontVariantNumeric: 'tabular-nums',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: `${en.space2} ${en.space3}`,
    minInlineSize: 0,
    paddingBlock: en.space2,
    paddingInline: en.space3,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusMd,
    backgroundColor: en.surface,
  },
  grow: {flex: '1 1 10rem', minInlineSize: 0, overflowWrap: 'anywhere'},
  debrief: {whiteSpace: 'pre-wrap'},
});

function kindOf(result: DuelResult, slot: DuelView['my_slot']): 'win' | 'loss' | 'draw' | 'forfeit-win' | 'forfeit-loss' | 'void' {
  const won = result.winner_slot !== null && result.winner_slot === slot;
  switch (result.outcome) {
    case 'win': return won ? 'win' : 'loss';
    case 'forfeit': return won ? 'forfeit-win' : 'forfeit-loss';
    case 'draw': return 'draw';
    default: return 'void';
  }
}

export interface ResultProps {
  roomId: string;
  duelId: string;
  view: DuelView;
  exam: Exam | undefined;
}

/** The outcome of a finished duel, the learner's own corrections, practice, and Nova's debrief when it is ready. */
export function Result({roomId, duelId, view, exam}: ResultProps): React.JSX.Element {
  const {t, i18n} = useLingui();
  const navigate = useNavigate();
  const serverText = useServerText();
  const catalog = useTopicCatalog();
  const query = useDuelResult(roomId, duelId, true);
  const body = query.data;
  const result = body && isResult(body) ? body : null;
  const pendingDebrief = result?.debrief_status === 'pending';
  const debriefQuery = useDebrief(roomId, duelId, pendingDebrief);
  const later = debriefQuery.data && isResult(debriefQuery.data) ? debriefQuery.data : null;
  const debrief = result?.debrief_status === 'ready' ? result.debrief : later?.debrief_status === 'ready' ? later.debrief : null;
  const debriefWaiting = pendingDebrief && later?.debrief_status !== 'ready' && later?.debrief_status !== 'failed' && later?.debrief_status !== 'skipped';

  if (query.isError) return <DuelError error={query.error} onRetry={() => void query.refetch()} />;
  if (!result) {
    return (
      <div {...stylex.props(styles.page)}>
        <p role="status" {...stylex.props(shared.muted)}>
          <Trans>Le résultat se prépare…</Trans>
        </p>
        <Skeleton width="100%" height="6rem" />
      </div>
    );
  }

  const slot = view.my_slot;
  const opponentSlot = slot === 1 ? 2 : 1;
  const mine = result.scores[String(slot)] ?? 0;
  const theirs = result.scores[String(opponentSlot)] ?? 0;
  const opponent = view.players.find(player => player.slot === opponentSlot)?.pseudo ?? t`Ton adversaire`;
  const kind = kindOf(result, slot);
  const title =
    kind === 'win'
      ? t`Victoire !`
      : kind === 'loss'
        ? t`Défaite`
        : kind === 'draw'
          ? t`Égalité`
          : kind === 'forfeit-win'
            ? t`Victoire par abandon`
            : kind === 'forfeit-loss'
              ? t`Duel abandonné`
              : t`Duel sans résultat`;
  const detail =
    kind === 'forfeit-win'
      ? t`${opponent} a abandonné ou n’a pas rendu de copie.`
      : kind === 'forfeit-loss'
        ? t`Tu as abandonné le duel, ou ta copie n’a pas été rendue.`
        : kind === 'void'
          ? t`Le duel n’a pas pu être corrigé : il ne compte pour personne.`
          : kind === 'draw'
            ? t`Vous avez le même score.`
            : '';
  const conceptLabel = (slug: string) => {
    const known = CONCEPTS[slug];
    if (known) return i18n._(known);
    const sub = catalog.data?.subtopics?.find(item => item.slug === slug);
    return sub ? serverText(sub.label) : humanize(slug);
  };
  const number = (id: string) => (exam?.questions.findIndex(question => question.id === id) ?? -1) + 1;

  return (
    <section aria-label={t`Résultat du duel`} {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.heading)}>
        <Mascot mood={kind === 'win' || kind === 'forfeit-win' ? 'cheer' : kind === 'loss' ? 'encourage' : 'idle'} size={64} />
        <h3 tabIndex={-1} {...stylex.props(shared.h2)}>
          {title}
        </h3>
      </div>
      {detail && <p {...stylex.props(shared.muted)}>{detail}</p>}
      {result.outcome !== 'void' && (
        <p {...stylex.props(styles.score)}>{t`Toi ${mine} – ${theirs} ${opponent}`}</p>
      )}
      {result.my_corrections.length > 0 && (
        <div {...stylex.props(styles.page)}>
          <h4 {...stylex.props(shared.kicker)}>
            <Trans>Ma correction</Trans>
          </h4>
          <ul {...stylex.props(shared.list)}>
            {result.my_corrections.map((item, index) => {
              const n = number(item.question_id) || index + 1;
              return (
                <li key={item.question_id} {...stylex.props(styles.row)}>
                  <span {...stylex.props(styles.grow)}>
                    {t`Question ${n}`} · {conceptLabel(item.concept)}
                  </span>
                  <Badge variant={item.correct ? 'success' : 'warning'} label={item.correct ? t`Juste` : t`À revoir`} />
                  <span {...stylex.props(shared.caption)}>{t`${item.points} / ${item.max_points} pts`}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {debrief ? (
        <div {...stylex.props(styles.page)}>
          <h4 {...stylex.props(shared.kicker)}>
            <Trans>Le bilan de Nova</Trans>
          </h4>
          <p {...stylex.props(shared.body, styles.debrief)}>
            <MathText text={debrief} />
          </p>
        </div>
      ) : (
        debriefWaiting && (
          <p role="status" {...stylex.props(shared.caption)}>
            <Trans>Nova prépare son bilan… il apparaîtra ici.</Trans>
          </p>
        )
      )}
      <div {...stylex.props(shared.actions)}>
        <Button variant="primary" label={t`M’entraîner sur la carte`} onClick={() => void navigate('/carte')} />
        <Button variant="secondary" label={t`Retour à la salle`} onClick={() => void navigate(`/salle/${roomId}`)} />
      </div>
    </section>
  );
}
