/** Messages the app sends on the learner's behalf, in the interface language. `topic` is already translated. */
const PROMPTS = {
  exercise: {
    fr: (topic: string) => `Propose un exercice sur ${topic}.`,
    en: (topic: string) => `Give me an exercise on ${topic}.`,
    ar: (topic: string) => `اقترح عليّ تمرينًا حول ${topic}.`,
  },
  review: {
    fr: (topic: string) => `Aide-moi à réviser cette notion : ${topic}.`,
    en: (topic: string) => `Help me review ${topic}.`,
    ar: (topic: string) => `ساعدني على مراجعة هذا المفهوم: ${topic}.`,
  },
};

type PromptKind = keyof typeof PROMPTS;

export function tutorPrompt(kind: PromptKind, locale: string, topic: string): string {
  const prompt = PROMPTS[kind];
  return (locale === 'en' ? prompt.en : locale === 'ar' ? prompt.ar : prompt.fr)(topic);
}
