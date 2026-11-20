import * as stylex from '@stylexjs/stylex';
import type {MessageDescriptor} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {useServerText} from '../../i18n/serverText';
import {en} from '../../theme/ednova.stylex';
import {EmptyNote} from '../../ui/EmptyNote';
import {useTopicCatalog} from '../accueil/queries';
import {useRoomInsights, type ExplanationFormat} from './queries';
import {shared} from './styles';

export const FORMAT_LABELS: Record<ExplanationFormat, MessageDescriptor> = {
  step_by_step: msg`Pas à pas`,
  examples: msg`Exemples`,
  visual: msg`Schéma`,
  analogy: msg`Analogie`,
};

const styles = stylex.create({
  groups: {display: 'grid', gap: en.space3, margin: 0, minInlineSize: 0},
  term: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeLabelSize, lineHeight: en.typeLabelLeading, fontWeight: 700},
  def: {margin: 0, color: en.ink, fontFamily: en.fontText, fontSize: en.typeBodySize, lineHeight: en.typeBodyLeading, overflowWrap: 'anywhere'},
});

/** The group's concept patterns for the running session: notions only, no message and no name. */
export function Insights({roomId}: {roomId: string}): React.JSX.Element | null {
  const {i18n, t} = useLingui();
  const serverText = useServerText();
  const catalog = useTopicCatalog();
  const insights = useRoomInsights(roomId, true);
  const data = insights.data;
  if (!data) return null;

  const labels = new Map([...(catalog.data?.topics ?? []), ...(catalog.data?.subtopics ?? [])].map(item => [item.slug, serverText(item.label)]));
  const name = (slug: string) => labels.get(slug) ?? slug.replaceAll('_', ' ');
  const groups: [string, string[]][] = [
    [t`Notions à revoir ensemble`, data.review_concepts.map(name)],
    [t`Notions les plus demandées`, data.asked_concepts.map(name)],
    [t`Notions déjà abordées`, data.covered_concepts.map(name)],
    [t`Formats jugés utiles`, data.helpful_formats.map(item => `${name(item.concept)} : ${i18n._(FORMAT_LABELS[item.format])}`)],
  ];
  const shown = groups.filter(([, items]) => items.length > 0);

  return (
    <section aria-label={t`Tendances du groupe`} {...stylex.props(shared.section)}>
      <h4 {...stylex.props(shared.kicker)}>
        <Trans>Tendances du groupe</Trans>
      </h4>
      {shown.length === 0 ? (
        <EmptyNote>
          <p {...stylex.props(shared.muted)}>
            <Trans>Aucune tendance à afficher pour le moment. Elles apparaissent quand assez de membres ont choisi d’y contribuer.</Trans>
          </p>
        </EmptyNote>
      ) : (
        <dl {...stylex.props(styles.groups)}>
          {shown.map(([title, items]) => (
            <div key={title}>
              <dt {...stylex.props(styles.term)}>{title}</dt>
              <dd {...stylex.props(styles.def)}>
                {items.join(', ')}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
