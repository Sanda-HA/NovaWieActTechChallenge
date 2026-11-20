// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {createApi} from './api';
import {isProRequired, planOf} from './plans';
import {memoryStorage} from '../app/testing';

describe('plans', () => {
  it('reads the plan from the server profile, never guessing before it answers', () => {
    expect(planOf(undefined)).toBeNull();
    expect(planOf({student_plan: 'pro'})).toBe('pro');
    expect(planOf({student_plan: 'free'})).toBe('free');
    expect(planOf({})).toBe('free');
  });

  it('tells every caller about a 403 pro_required, with the feature, and names the error code', async () => {
    const features: (string | undefined)[] = [];
    const api = createApi({
      storage: memoryStorage(),
      onProRequired: feature => features.push(feature),
      fetchImpl: async () => Response.json({detail: {error: 'pro_required', feature: 'personal_quiz'}}, {status: 403}),
    });
    const error = await api.request('GET', '/learning/quiz/x').catch((failure: unknown) => failure);
    expect(isProRequired(error)).toBe(true);
    expect(features).toStrictEqual(['personal_quiz']);
  });

  it('does not treat another 403 as a plan problem', async () => {
    let called = false;
    const api = createApi({
      storage: memoryStorage(),
      onProRequired: () => void (called = true),
      fetchImpl: async () => Response.json({detail: {error: 'forbidden'}}, {status: 403}),
    });
    const error = await api.request('GET', '/groups/rooms/x').catch((failure: unknown) => failure);
    expect(isProRequired(error)).toBe(false);
    expect(called).toBe(false);
  });
});
