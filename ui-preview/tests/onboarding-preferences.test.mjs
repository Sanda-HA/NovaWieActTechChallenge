import assert from 'node:assert/strict';
import test from 'node:test';
import {saveOnboardingPreferences} from '../src/onboarding-preferences.mjs';

test('saves only available tools and preserves an empty selection', async () => {
  const calls = [];
  const api = {request(method, path, options) { calls.push([method, path, options.json]); }};
  await saveOnboardingPreferences(api, {lang: 'en', style: 'visuel', tools: new Set(['feynman', 'ai-cards'])});
  await saveOnboardingPreferences(api, {lang: 'fr', style: 'lecture', tools: new Set()});
  assert.deepEqual(calls, [
    ['PUT', '/me/profile', {reply_language: 'en', presentation: 'visual', enabled_tools: ['feynman']}],
    ['PUT', '/me/profile', {reply_language: 'fr', presentation: 'reading', enabled_tools: []}],
  ]);
});

test('each onboarding step saves only its own choice before the diagnostic', async () => {
  const saved = [];
  const api = {request(_method, _path, {json}) { saved.push(json); }};
  const choices = {lang:'en',style:'lecture',tools:new Set()};
  for (const step of ['bac','style','outils']) await saveOnboardingPreferences(api,choices,step);
  assert.deepEqual(saved,[{reply_language:'en'},{presentation:'reading'},{enabled_tools:[]}]);
});
