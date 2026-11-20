import {z} from 'zod';

export const CITY_MAX = 50;

/** Issue messages are codes: the form maps them to translated copy. */
export const settingsSchema = z.object({
  city: z.string().trim().max(CITY_MAX, {error: 'too_long'}),
  subjects: z.string(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  section: z.string(),
  reply_language: z.enum(['fr', 'en', 'ar']),
  presentation: z.enum(['visual', 'reading']).nullable(),
  enabled_tools: z.array(z.string()),
});
export type SettingsValues = z.input<typeof settingsSchema>;

export const splitSubjects = (value: string): string[] =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

/** Delete stays locked until the pseudo is copied exactly. */
export const canDelete = (typed: string, pseudo: string | null, busy: boolean): boolean => !busy && !!pseudo && typed === pseudo;
