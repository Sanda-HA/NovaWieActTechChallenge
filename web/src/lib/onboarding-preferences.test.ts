// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {saveOnboardingPreferences} from './onboarding-preferences';
import type {Api, OnboardingChoices, RequestOptions} from './types';

describe('onboarding preferences', () => {
  it('saves only available tools and preserves an empty selection', async () => {
    const calls: unknown[][] = [];
    const api = {request(method: string, path: string, options: RequestOptions) { calls.push([method, path, options.json]); }};
    await saveOnboardingPreferences(api as unknown as Api, {lang: 'en', style: 'visuel', tools: new Set(['feynman', 'ai-cards'])});
    await saveOnboardingPreferences(api as unknown as Api, {lang: 'fr', style: 'lecture', tools: new Set()});
    expect(calls).toStrictEqual([
      ['PUT', '/me/profile', {reply_language: 'en', presentation: 'visual', enabled_tools: ['feynman']}],
      ['PUT', '/me/profile', {reply_language: 'fr', presentation: 'reading', enabled_tools: []}],
    ]);
  });

  it('each onboarding step saves only its own choice before the diagnostic', async () => {
    const saved: unknown[] = [];
    const api = {request(_method: string, _path: string, {json}: RequestOptions = {}) { saved.push(json); }};
    const choices: OnboardingChoices = {lang:'en', style:'lecture', tools:new Set()};
    for (const step of ['bac', 'style', 'outils']) await saveOnboardingPreferences(api as unknown as Api, choices, step);
    expect(saved).toStrictEqual([{reply_language:'en'}, {presentation:'reading'}, {enabled_tools:[]}]);
  });

  it('the bac step saves the chosen section with the reply language', async () => {
    const saved: unknown[] = [];
    const api = {request(_method: string, _path: string, {json}: RequestOptions = {}) { saved.push(json); }};
    const choices: OnboardingChoices = {lang:'fr', section:'sciences_experimentales', style:null, tools:new Set(['guided'])};
    await saveOnboardingPreferences(api as unknown as Api, choices, 'bac');
    await saveOnboardingPreferences(api as unknown as Api, choices);
    expect(saved).toStrictEqual([
      {reply_language:'fr', section:'sciences_experimentales'},
      {reply_language:'fr', section:'sciences_experimentales', presentation:null, enabled_tools:['guided']},
    ]);
  });
});
