import * as stylex from '@stylexjs/stylex';
import {Trans, useLingui} from '@lingui/react/macro';
import {useId} from 'react';
import {useServerText} from '../../i18n/serverText';
import {en} from '../../theme/ednova.stylex';
import {usePlan} from '../plans/queries';
import {useGroupReview, useTopicCatalog} from './queries';
import {intlLocale} from '../../lib/i18n-store';

const styles = stylex.create({
  section: {display: 'grid', gap: en.space3, justifyItems: 'start', minInlineSize: 0},
  title: {
    margin: 0,
    color: en.ink,
    fontFamily: en.fontDisplay,
    fontSize: en.typeHeadingSize,
    lineHeight: en.typeHeadingLeading,
    fontWeight: en.typeHeadingWeight,
  },
  text: {margin: 0, color: en.inkMuted, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading},
  strong: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, fontWeight: 700},
  list: {display: 'grid', gap: en.space2, inlineSize: '100%', margin: 0, padding: 0, listStyle: 'none'},
  item: {
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
  name: {display: 'grid', gap: 2, minInlineSize: 0, overflowWrap: 'anywhere'},
});

/** What the learner's group sessions left to revisit. Private: it appears here only, never in the room. */
export function GroupReview(): React.JSX.Element | null {
  const {i18n, t} = useLingui();
  const serverText = useServerText();
  const titleId = useId();
  const {plan} = usePlan();
  const review = useGroupReview(plan === 'pro');
  const catalog = useTopicCatalog();
  const items = review.data?.items ?? [];
  if (items.length === 0) return null;

  const labels = new Map([...(catalog.data?.topics ?? []), ...(catalog.data?.subtopics ?? [])].map(item => [item.slug, serverText(item.label)]));
  const name = (slug: string) => labels.get(slug) ?? slug.replaceAll('_', ' ');
  const day = new Intl.DateTimeFormat(intlLocale(i18n.locale), {day: 'numeric', month: 'long'});

  return (
    <section aria-labelledby={titleId} {...stylex.props(styles.section)}>
      <h2 id={titleId} {...stylex.props(styles.title)}>
        <Trans>À revoir après tes séances de groupe</Trans>
      </h2>
      <p {...stylex.props(styles.text)}>
        <Trans>Ces notions restent privées : seul toi les vois, ici.</Trans>
      </p>
      <ul {...stylex.props(styles.list)}>
        {items.map(item => {
          const until = day.format(new Date(item.review_until));
          return (
            <li key={`${item.topic}:${item.concept}`} {...stylex.props(styles.item)}>
              <div {...stylex.props(styles.name)}>
                <strong {...stylex.props(styles.strong)}>{name(item.concept)}</strong>
                <span {...stylex.props(styles.text)}>{name(item.topic)}</span>
              </div>
              <span {...stylex.props(styles.text)}>
                {item.priority === 1 ? t`À revoir en priorité, avant le ${until}` : t`À revoir avant le ${until}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
