import {useQuery} from '@tanstack/react-query';
import {useSession} from '../../app/session';
import type {Profile, ProgressRow} from '../../lib/types';
import {TESSERA_AREA, type MasteryLevel, type TesseraSize} from '../../ui/Mosaic';

export interface HomeProfile extends Partial<Profile> {
  presentation?: 'visual' | 'reading' | null;
  enabled_tools?: string[];
}

interface CatalogTopic {
  slug: string;
  label: string;
  prerequisites?: string[];
}

export interface TopicCatalog {
  topics?: CatalogTopic[];
  subtopics?: {slug: string; label: string; parent: string}[];
}

export interface ProgressResult {
  topics?: ProgressRow[];
  subtopics?: ProgressRow[];
  mistakes?: {topic: string; label: string; type: string}[];
}

export interface Chapter {
  id: string;
  /** French, from the catalog. */
  label: string;
  mastery: number | null;
  level: MasteryLevel;
  attempts: number;
  confusions: number;
  size: TesseraSize;
}

/** The same thresholds as the chapter map: below .4 fragile, below .75 on the way, then solid. */
export const levelOf = (mastery: number | null | undefined): MasteryLevel =>
  mastery == null ? 'unknown' : mastery < 0.4 ? 'weak' : mastery < 0.75 ? 'medium' : 'strong';

/**
 * A chapter weighs what rests on it: the chapters that list it as a prerequisite, plus its own sub-chapters.
 * Three or more make a large tile, two a wide one.
 */
export function buildChapters(catalog: TopicCatalog | undefined, progress: ProgressResult | undefined): Chapter[] {
  const topics = Array.isArray(catalog?.topics) ? catalog.topics : [];
  const subtopics = Array.isArray(catalog?.subtopics) ? catalog.subtopics : [];
  const rows = new Map((Array.isArray(progress?.topics) ? progress.topics : []).map(row => [row.topic, row]));
  return topics.map(topic => {
    const weight =
      topics.filter(other => other.prerequisites?.includes(topic.slug)).length +
      subtopics.filter(sub => sub.parent === topic.slug).length;
    const row = rows.get(topic.slug);
    const mastery = row?.mastery ?? null;
    return {
      id: topic.slug,
      label: topic.label,
      mastery,
      level: levelOf(mastery),
      attempts: row?.attempts ?? 0,
      confusions: row?.confusions ?? 0,
      size: weight >= 3 ? 'large' : weight === 2 ? 'wide' : 'small',
    };
  });
}

/** The evaluated chapter with the lowest mastery; confusions break a tie. */
export function weakestChapter(chapters: readonly Chapter[]): Chapter | null {
  let weakest: Chapter | null = null;
  for (const chapter of chapters) {
    if (chapter.mastery == null) continue;
    if (
      !weakest ||
      chapter.mastery < (weakest.mastery ?? 1) ||
      (chapter.mastery === weakest.mastery && chapter.confusions > weakest.confusions)
    )
      weakest = chapter;
  }
  return weakest;
}

/** How much of the mosaic is set: mastery averaged over the tiles' area, an unevaluated tile counting as raw. */
export function mosaicShare(chapters: readonly Chapter[]): number {
  let area = 0;
  let set = 0;
  for (const chapter of chapters) {
    const cells = TESSERA_AREA[chapter.size];
    area += cells;
    set += cells * (chapter.mastery ?? 0);
  }
  return area ? set / area : 0;
}

export function useProfile() {
  const {api} = useSession();
  return useQuery({
    queryKey: ['profile'],
    queryFn: ({signal}) => api.request<HomeProfile>('GET', '/me/profile', {signal}),
    // Operators change plans outside the app: reconcile whenever the learner comes back.
    refetchOnWindowFocus: 'always',
  });
}

export function useTopicCatalog() {
  const {api} = useSession();
  return useQuery({
    queryKey: ['topics'],
    queryFn: ({signal}) => api.request<TopicCatalog>('GET', '/topics', {signal}),
    staleTime: 5 * 60_000,
  });
}

export function useLearningProgress(enabled = true) {
  const {api} = useSession();
  return useQuery({
    queryKey: ['learning-progress'],
    enabled,
    queryFn: ({signal}) => api.request<ProgressResult>('GET', '/learning/progress', {signal}),
  });
}
