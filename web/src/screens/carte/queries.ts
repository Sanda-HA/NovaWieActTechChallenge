import {useQuery} from '@tanstack/react-query';
import {useSession} from '../../app/session';
import {levelOf, buildChapters, type Chapter, type ProgressResult, type TopicCatalog} from '../accueil/queries';
import type {MasteryLevel} from '../../ui/Mosaic';

export {useLearningProgress, useTopicCatalog} from '../accueil/queries';

export interface ChapterRow {
  id: string;
  /** French, from the catalog. */
  label: string;
  mastery: number | null;
  level: MasteryLevel;
  attempts: number;
  solved: number;
}

export interface MapChapter extends Chapter {
  solved: number;
  subtopics: ChapterRow[];
}

/** The chapters as the Accueil mosaic sees them, plus what the chapter panel and the detail list need. */
export function buildMap(catalog: TopicCatalog | undefined, progress: ProgressResult | undefined): MapChapter[] {
  const subtopics = Array.isArray(catalog?.subtopics) ? catalog.subtopics : [];
  const rows = new Map(
    [...(Array.isArray(progress?.topics) ? progress.topics : []), ...(Array.isArray(progress?.subtopics) ? progress.subtopics : [])].map(row => [
      row.topic,
      row,
    ]),
  );
  return buildChapters(catalog, progress).map(chapter => ({
    ...chapter,
    solved: rows.get(chapter.id)?.solved ?? 0,
    subtopics: subtopics
      .filter(sub => sub.parent === chapter.id)
      .map(sub => {
        const row = rows.get(sub.slug);
        const mastery = row?.mastery ?? null;
        return {id: sub.slug, label: sub.label, mastery, level: levelOf(mastery), attempts: row?.attempts ?? 0, solved: row?.solved ?? 0};
      }),
  }));
}

/** Subjects other than mathematics have no chapter tracking yet: three ideas to review with Nova. */
export const REVISION_TOPICS: Record<string, readonly string[]> = {
  svt: ['Photosynthèse', 'Transmission de l’information génétique', 'Immunité'],
  physics: ['Lois de Newton', 'Circuits électriques et dipôle RC', 'Ondes'],
  chemistry: ['Équilibrage des équations', 'Réactions acido-basiques', 'Cinétique chimique'],
  french: ['Conjugaison', 'Analyse de texte', 'Argumentation'],
  english: ['Temps verbaux', 'Compréhension écrite', 'Expression écrite'],
  history: ['Révolution française', 'Révolution industrielle', 'Décolonisation'],
  geography: ['Zones climatiques', 'Urbanisation', 'Mondialisation'],
  philosophy: ['Liberté', 'Vérité', 'Justice'],
  computer_science: ['Conditions et boucles', 'Fonctions', 'Listes et tableaux'],
};

export interface GroupReviewItem {
  topic: string;
  concept: string;
  priority: 1 | 2;
  review_until: string;
}

/** Private revisits left by group sessions; Pro only, so it stays idle until the plan is known to be Pro. */
export function useGroupReview(enabled: boolean) {
  const {api} = useSession();
  return useQuery({
    queryKey: ['group-review'],
    queryFn: ({signal}) => api.request<{items: GroupReviewItem[]}>('GET', '/learning/group-review', {signal}),
    enabled,
    retry: false,
  });
}
