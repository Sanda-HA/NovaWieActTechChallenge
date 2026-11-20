import * as stylex from '@stylexjs/stylex';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {Trans, useLingui} from '@lingui/react/macro';
import {useId, useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router';
import {useSession} from '../../app/session';
import {FEATURES, FREE_HIGHLIGHTS, PRO_HIGHLIGHTS, PRO_PRICE_TND} from '../../lib/plans';
import type {StudentPlan} from '../../lib/types';
import {en} from '../../theme/ednova.stylex';
import {Mascot} from '../../ui/Mascot';
import {ErrorBanner} from '../../ui/ErrorBanner';
import {Icon} from '../../ui/icons';
import {useCancelProRequest, usePlan, useRequestPro} from './queries';

const styles = stylex.create({
  novaRow: {display: 'flex', alignItems: 'center', gap: en.space3, minInlineSize: 0},
  hero: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: {default: en.space2, '@media (width >= 640px)': en.space6},
    padding: {default: en.space4, '@media (width >= 640px)': en.space8},
    borderRadius: en.radiusXl,
    backgroundColor: en.argileSoft,
  },
  title: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: {default: '1.5rem', '@media (width >= 360px)': '1.75rem', '@media (width >= 640px)': '2.5rem'},
    lineHeight: 1.12,
    textWrap: 'balance',
  },
  current: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeLabelSize, lineHeight: en.typeLabelLeading, fontWeight: 700},
  section: {display: 'grid', gap: en.space5, minInlineSize: 0},
  head: {display: 'grid', gap: en.space1},
  h2: {margin: 0, color: en.ink, fontFamily: en.fontDisplay, fontSize: en.typeHeadingSize, lineHeight: en.typeHeadingLeading, fontWeight: en.typeHeadingWeight},
  text: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, textWrap: 'pretty'},
  member: {
    display: 'grid',
    gap: en.space1,
    padding: en.space4,
    borderRadius: en.radiusMd,
    backgroundColor: en.surfaceSunken,
  },
  memberName: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, fontWeight: 700, overflowWrap: 'anywhere'},
  cards: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 720px)': 'repeat(2, minmax(0, 1fr))'},
    gap: en.space4,
  },
  card: {
    display: 'grid',
    gridTemplateRows: 'auto auto auto 1fr auto',
    gap: en.space3,
    minInlineSize: 0,
    padding: en.space5,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
    borderRadius: en.radiusXl,
    backgroundColor: en.surface,
    boxShadow: en.shadowRaise,
  },
  proCard: {borderColor: en.argileStrong},
  cardHead: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: en.space2},
  price: {display: 'flex', alignItems: 'baseline', gap: en.space2, margin: 0, color: en.ink, fontFamily: en.fontText},
  amount: {fontFamily: en.fontDisplay, fontSize: en.typeTitleSize, lineHeight: en.typeTitleLeading, fontWeight: en.typeTitleWeight},
  bullets: {display: 'grid', gap: en.space2, margin: 0, padding: 0, listStyle: 'none'},
  bullet: {display: 'flex', alignItems: 'flex-start', gap: en.space2, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  tick: {display: 'inline-flex', flexShrink: 0, marginBlockStart: 2, color: en.masteryStrong},
  activities: {
    display: 'grid',
    gridTemplateColumns: {default: 'minmax(0, 1fr)', '@media (width >= 900px)': 'repeat(auto-fit, minmax(12rem, 1fr))'},
    gap: en.space3,
  },
  activity: {
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    gap: en.space3,
    padding: en.space4,
    backgroundColor: en.surface,
    borderRadius: en.radiusLg,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: en.line,
  },
  request: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: en.space3},
  status: {display: 'inline-flex', alignItems: 'center', gap: en.space2, margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize},
  tableHead: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: en.space3},
  scroll: {overflowX: 'auto', minInlineSize: 0},
  table: {inlineSize: '100%', borderCollapse: 'collapse', fontFamily: en.fontText, fontSize: en.typeBodySize, color: en.ink},
  th: {
    paddingBlock: en.space2,
    paddingInline: en.space3,
    textAlign: 'start',
    color: en.inkMuted,
    fontSize: en.typeCaptionSize,
    fontWeight: 700,
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: en.line,
  },
  thCenter: {textAlign: 'center'},
  row: {borderBlockEndWidth: 1, borderBlockEndStyle: 'solid', borderBlockEndColor: en.line},
  feature: {display: 'grid', gap: 2, paddingBlock: en.space3, paddingInline: en.space3, textAlign: 'start', fontWeight: 400},
  featureTitle: {fontWeight: 700},
  featureDetail: {color: en.inkMuted, fontSize: en.typeCaptionSize, lineHeight: en.typeCaptionLeading},
  cell: {paddingInline: en.space3, textAlign: 'center', whiteSpace: 'nowrap'},
  hidden: {
    position: 'absolute',
    inlineSize: 1,
    blockSize: 1,
    margin: -1,
    padding: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
});

type Filter = 'all' | 'differences';

function Included({yes}: {yes: boolean}): React.JSX.Element {
  const {t} = useLingui();
  return (
    <>
      <span aria-hidden="true">{yes ? '✓' : '—'}</span>
      <span {...stylex.props(styles.hidden)}>{yes ? t`Inclus` : t`Non inclus`}</span>
    </>
  );
}

function PlanCard({
  plan,
  current,
  heading: CardTitle,
  children,
}: {
  plan: StudentPlan;
  current: boolean;
  heading: 'h2' | 'h3';
  children: ReactNode;
}): React.JSX.Element {
  const {i18n, t} = useLingui();
  const titleId = useId();
  const pro = plan === 'pro';
  const bullets = pro ? PRO_HIGHLIGHTS.map(key => i18n._(FEATURES[key].title)) : FREE_HIGHLIGHTS.map(line => i18n._(line));
  return (
    <article aria-labelledby={titleId} {...stylex.props(styles.card, pro && styles.proCard)}>
      <div {...stylex.props(styles.cardHead)}>
        <CardTitle id={titleId} {...stylex.props(styles.h2)}>
          {pro ? t`Offre Pro` : t`Offre gratuite`}
        </CardTitle>
        {current && <Badge variant="success" label={t`Ton offre`} />}
      </div>
      <p {...stylex.props(styles.price)}>
        <span {...stylex.props(styles.amount)}>{pro ? PRO_PRICE_TND : 0}</span>
        <span>
          <Trans>TND / mois</Trans>
        </span>
      </p>
      <p {...stylex.props(styles.text)}>{pro ? t`Toute l’offre gratuite, plus` : t`Pour tes révisions au quotidien`}</p>
      <ul {...stylex.props(styles.bullets)}>
        {bullets.map(line => (
          <li key={line} {...stylex.props(styles.bullet)}>
            <span aria-hidden="true" {...stylex.props(styles.tick)}>
              <Icon name="check" size={16} />
            </span>
            {line}
          </li>
        ))}
      </ul>
      <div {...stylex.props(styles.request)}>{children}</div>
    </article>
  );
}

function ActivityCard({feature, href, action}: {
  feature: 'revisionDemo' | 'interactiveLab' | 'bacPractice';
  href: string;
  action?: string;
}): React.JSX.Element {
  const {i18n, t} = useLingui();
  const {tier, title, detail} = FEATURES[feature];
  return (
    <div {...stylex.props(styles.activity)}>
      <div {...stylex.props(styles.cardHead)}>
        <h3 {...stylex.props(styles.memberName)}>{i18n._(title)}</h3>
        <Badge variant={tier === 'pro' ? 'neutral' : 'success'} label={tier === 'pro' ? t`Pro` : t`Gratuit`} />
      </div>
      <p {...stylex.props(styles.text)}>{i18n._(detail)}</p>
      {action && <div><Button variant="secondary" href={href} label={action} /></div>}
    </div>
  );
}

function Comparison(): React.JSX.Element {
  const {i18n, t} = useLingui();
  const titleId = useId();
  const [filter, setFilter] = useState<Filter>('all');
  const rows = Object.entries(FEATURES).filter(([, feature]) => filter === 'all' || feature.tier === 'pro');
  return (
    <section aria-labelledby={titleId} {...stylex.props(styles.section)}>
      <div {...stylex.props(styles.tableHead)}>
        <h3 id={titleId} {...stylex.props(styles.h2)}>
          <Trans>Comparer les fonctionnalités</Trans>
        </h3>
        <SegmentedControl label={t`Afficher les fonctionnalités`} value={filter} onChange={value => setFilter(value as Filter)}>
          <SegmentedControlItem value="all" label={t`Toutes`} />
          <SegmentedControlItem value="differences" label={t`Différences`} />
        </SegmentedControl>
      </div>
      <div {...stylex.props(styles.scroll)}>
        <table aria-labelledby={titleId} {...stylex.props(styles.table)}>
          <thead>
            <tr>
              <th scope="col" {...stylex.props(styles.th)}>
                <Trans>Activité</Trans>
              </th>
              <th scope="col" {...stylex.props(styles.th, styles.thCenter)}>
                <Trans>Gratuit</Trans>
              </th>
              <th scope="col" {...stylex.props(styles.th, styles.thCenter)}>
                <Trans>Pro</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, feature]) => (
              <tr key={key} {...stylex.props(styles.row)}>
                <th scope="row" {...stylex.props(styles.feature)}>
                  <span {...stylex.props(styles.featureTitle)}>{i18n._(feature.title)}</span>
                  <span {...stylex.props(styles.featureDetail)}>{i18n._(feature.detail)}</span>
                </th>
                <td {...stylex.props(styles.cell)}>
                  <Included yes={feature.tier === 'free'} />
                </td>
                <td {...stylex.props(styles.cell)}>
                  <Included yes />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Mon offre, the two plans with the proposed price, the pilot access request, and the feature table. */
export function PlansSection({heading = 'h2'}: {heading?: 'h1' | 'h2'}): React.JSX.Element {
  const {t} = useLingui();
  const {tutor} = useSession();
  const navigate = useNavigate();
  const {plan, requested, isError, refetch} = usePlan();
  const request = useRequestPro();
  const cancel = useCancelProRequest();
  const titleId = useId();
  const memberId = useId();
  const Title = heading;
  const fullPage = heading === 'h1';
  const wide = useMediaQuery('(width >= 640px)');
  const CardTitle = fullPage ? 'h2' : 'h3';
  const currentPlan = plan === 'pro' ? t`Tu es sur l’offre Pro.` : t`Tu es sur l’offre gratuite.`;
  const guided = () => {
    const id = tutor.newThread({subject: 'math', mode: 'guided'});
    void navigate('/tuteur');
    void tutor.send(id, t`Propose un exercice sur la dérivabilité.`, 'new_question');
  };
  const pending = requested;

  return (
    <section aria-labelledby={titleId} {...stylex.props(styles.section)}>
      <header {...stylex.props(fullPage ? styles.hero : styles.novaRow)}>
        {!fullPage && <Mascot size={72} />}
        <div {...stylex.props(styles.head)}>
          <Title id={titleId} {...stylex.props(fullPage ? styles.title : styles.h2)}>
            <Trans>Les offres Nova</Trans>
          </Title>
          <p {...stylex.props(styles.text)}>
            {fullPage
              ? t`L’offre Pro est activée par l’équipe Nova pendant le pilote.`
              : t`L’offre Pro est activée par l’équipe Nova pendant le pilote. Prix proposé : ${PRO_PRICE_TND} TND par mois.`}
          </p>
          {fullPage && plan && <p {...stylex.props(styles.current)}>{currentPlan}</p>}
        </div>
        {fullPage && <Mascot mood="wave" size={wide ? 176 : 108} />}
      </header>
      {isError && <ErrorBanner message={t`Chargement indisponible. Réessaie.`} onRetry={refetch} />}
      {!fullPage && plan && (
        <section aria-labelledby={memberId} {...stylex.props(styles.member)}>
          <h3 id={memberId} {...stylex.props(styles.memberName)}><Trans>Mon offre</Trans></h3>
          <p {...stylex.props(styles.text)}>{currentPlan}</p>
          <Button variant="ghost" href="/offres" label={plan === 'pro' ? t`Voir mon offre` : t`Comparer les offres`} />
        </section>
      )}
      <div {...stylex.props(styles.cards)}>
        <PlanCard plan="free" current={plan === 'free'} heading={CardTitle}>
          <Button variant="secondary" label={t`Essayer un exercice guidé`} onClick={guided} />
          <Button variant="ghost" label={t`Essayer le quiz d’exemple`} onClick={() => void navigate('/carte?activity=sample')} />
        </PlanCard>
        <PlanCard plan="pro" current={plan === 'pro'} heading={CardTitle}>
          {plan === 'free' && (pending ? (
            <>
            <p role="status" {...stylex.props(styles.status)}>
              <Icon name="check" size={16} />
              <Trans>Demande Pro enregistrée. L’équipe Nova activera ton accès : reviens ici pour le voir.</Trans>
            </p>
            <Button variant="secondary" label={t`Annuler ma demande`} isLoading={cancel.isPending} onClick={() => cancel.mutate()} />
            </>
          ) : (
            <Button variant="primary" label={t`Demander l’accès Pro`} isLoading={request.isPending} onClick={() => request.mutate()} />
          ))}
          {cancel.isError && <ErrorBanner message={t`Annulation indisponible. Réessaie.`} onRetry={() => cancel.mutate()} />}
          {request.isError && <ErrorBanner message={t`Demande indisponible. Réessaie.`} onRetry={() => request.mutate()} />}
          {plan === 'pro' && <Button variant="primary" label={t`Essayer un quiz de chapitre`} onClick={() => void navigate('/carte')} />}
        </PlanCard>
      </div>
      {fullPage && plan && (
        <section {...stylex.props(styles.section)}>
          <h2 {...stylex.props(styles.h2)}><Trans>Outils de révision</Trans></h2>
          <div {...stylex.props(styles.activities)}>
            <ActivityCard feature="revisionDemo" href="/carte?activity=revision" action={t`Essayer la fiche`} />
            <ActivityCard feature="interactiveLab" href="/carte?activity=lab" action={plan === 'pro' ? t`Ouvrir le labo` : undefined} />
            <ActivityCard feature="bacPractice" href="/carte?activity=timed" action={plan === 'pro' ? t`Essayer l’entraînement Bac` : undefined} />
          </div>
        </section>
      )}
      <Comparison />
    </section>
  );
}
