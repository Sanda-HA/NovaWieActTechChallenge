// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {allowedEndpoint} from './routes.ts';

const room = '3f2b8c1e-9a4d-4e7f-8b6a-1c2d3e4f5a6b';

describe('allowedEndpoint', () => {
  it.each([
    ['GET', '/auth/me', '', '/auth/me'],
    ['GET', `/groups/rooms/${room}/posts`, '', `/groups/rooms/${room}/posts`],
    ['GET', `/groups/rooms/${room}/posts`, '?before=12', `/groups/rooms/${room}/posts?before=12`],
    ['POST', `/tutor/sessions/${room}/messages/stream`, '', `/tutor/sessions/${room}/messages/stream`],
    ['GET', '/learning/sample-quiz', '', '/learning/sample-quiz'],
    ['GET', `/groups/rooms/${room}/session/quiz`, '', `/groups/rooms/${room}/session/quiz`],
    ['POST', '/me/pro-request', '', '/me/pro-request'],
    ['DELETE', '/me/pro-request', '', '/me/pro-request'],
    ['POST', '/learning/mistake-practice', '', '/learning/mistake-practice'],
    ['GET', '/learning/group-review', '', '/learning/group-review'],
    ['GET', '/learning/interactive-lab/derivabilite', '', '/learning/interactive-lab/derivabilite'],
    ['GET', '/learning/interactive-lab/svt_0', '', '/learning/interactive-lab/svt_0'],
    ['GET', '/learning/bac-practice/derivabilite', '', '/learning/bac-practice/derivabilite'],
    ['POST', '/learning/revision-pack/derivabilite', '', '/learning/revision-pack/derivabilite'],
    ['POST', '/learning/revision-demo/completion', '', '/learning/revision-demo/completion'],
    ['GET', `/groups/rooms/${room}/consent`, '', `/groups/rooms/${room}/consent`],
    ['GET', `/groups/rooms/${room}/session/insights`, '', `/groups/rooms/${room}/session/insights`],
    ['GET', `/groups/rooms/${room}/session/tutor/requests/${room}`, '', `/groups/rooms/${room}/session/tutor/requests/${room}`],
    ['POST', `/groups/rooms/${room}/session/tutor/requests`, '', `/groups/rooms/${room}/session/tutor/requests`],
    ['PUT', `/groups/rooms/${room}/session/posts/42/helpfulness`, '', `/groups/rooms/${room}/session/posts/42/helpfulness`],
    ['GET', `/groups/rooms/${room}/duels`, '', `/groups/rooms/${room}/duels`],
    ['GET', `/groups/rooms/${room}/duels/blueprints`, '', `/groups/rooms/${room}/duels/blueprints`],
    ['GET', `/groups/rooms/${room}/duels/${room}`, '', `/groups/rooms/${room}/duels/${room}`],
    ['GET', `/groups/rooms/${room}/duels/${room}/exam`, '', `/groups/rooms/${room}/duels/${room}/exam`],
    ['GET', `/groups/rooms/${room}/duels/${room}/attempt`, '', `/groups/rooms/${room}/duels/${room}/attempt`],
    ['GET', `/groups/rooms/${room}/duels/${room}/result`, '', `/groups/rooms/${room}/duels/${room}/result`],
    ['POST', `/groups/rooms/${room}/duels`, '', `/groups/rooms/${room}/duels`],
    ['POST', `/groups/rooms/${room}/duels/join`, '', `/groups/rooms/${room}/duels/join`],
    ['POST', `/groups/rooms/${room}/duels/${room}/accept`, '', `/groups/rooms/${room}/duels/${room}/accept`],
    ['POST', `/groups/rooms/${room}/duels/${room}/withdraw`, '', `/groups/rooms/${room}/duels/${room}/withdraw`],
    ['POST', `/groups/rooms/${room}/duels/${room}/attempt/submit`, '', `/groups/rooms/${room}/duels/${room}/attempt/submit`],
    ['PUT', `/groups/rooms/${room}/duels/${room}/ready`, '', `/groups/rooms/${room}/duels/${room}/ready`],
    ['PUT', `/groups/rooms/${room}/duels/${room}/attempt/answers/a1b2c3d4e5f60718293a4b5c6d7e8f90`, '', `/groups/rooms/${room}/duels/${room}/attempt/answers/a1b2c3d4e5f60718293a4b5c6d7e8f90`],
    ['PATCH', `/groups/rooms/${room}/settings`, '', `/groups/rooms/${room}/settings`],
    ['PATCH', `/groups/rooms/${room}/consent`, '', `/groups/rooms/${room}/consent`],
    ['PUT', '/me/profile', '', '/me/profile'],
    ['DELETE', `/groups/rooms/${room}/members/yasmine07`, '', `/groups/rooms/${room}/members/yasmine07`],
    ['GET', '/me/profile', '?x=1', '/me/profile'],
    ['GET', `/groups/rooms/${room}/posts`, '?before=abc', `/groups/rooms/${room}/posts`],
    ['GET', `/groups/rooms/${room}/posts`, '?before=1234567890123', `/groups/rooms/${room}/posts`],
    ['GET', `/groups/rooms/${room}/posts`, '?before=12&x=1', `/groups/rooms/${room}/posts`],
    ['POST', `/groups/rooms/${room}/posts`, '?before=12', `/groups/rooms/${room}/posts`],
  ])('allows %s %s%s as %s', (method, pathname, search, expected) => {
    expect(allowedEndpoint(method, pathname, search)).toBe(expected);
  });

  it.each([
    ['GET', '/posts', '?before=abc'],
    ['PATCH', '/me/profile', ''],
    ['PATCH', `/groups/rooms/${room}`, ''],
    ['PATCH', `/groups/rooms/${room}/owner`, ''],
    ['POST', `/groups/rooms/${room}/settings`, ''],
    ['GET', `/groups/rooms/${room}/session/tutor/requests`, ''],
    ['GET', `/groups/rooms/${room}/session/tutor/requests/abc`, ''],
    ['POST', `/groups/rooms/${room}/session/tutor/requests/${room}`, ''],
    ['GET', `/groups/rooms/${room}/consent/extra`, ''],
    ['GET', `/groups/rooms/${room}/duels/other`, ''],
    ['GET', `/groups/rooms/${room}/duels/${room}/answers`, ''],
    ['GET', `/groups/rooms/${room}/duels/blueprints/x`, ''],
    ['GET', `/groups/rooms/${room}/duels/${room}/result/x`, ''],
    ['DELETE', `/groups/rooms/${room}/duels/${room}`, ''],
    ['PATCH', `/groups/rooms/${room}/duels/${room}`, ''],
    ['POST', `/groups/rooms/${room}/duels/${room}/ready`, ''],
    ['POST', `/groups/rooms/${room}/duels/${room}/attempt/answers/a1b2c3d4e5f60718293a4b5c6d7e8f90`, ''],
    ['POST', `/groups/rooms/${room}/duels/${room}/attempt`, ''],
    ['PUT', `/groups/rooms/${room}/duels/${room}/accept`, ''],
    ['PUT', `/groups/rooms/${room}/duels/${room}/attempt/answers/..%2Fx`, ''],
    ['PUT', `/groups/rooms/${room}/duels/${room}/attempt/answers/not-hex`, ''],
    ['PUT', `/groups/rooms/${room}/duels/${room}/attempt/answers/a1b2c3d4e5f60718293a4b5c6d7e8f90/x`, ''],
    ['POST', `/groups/rooms/${room}/duels/join/x`, ''],
    ['PUT', `/groups/rooms/${room}/session/posts/abc/helpfulness`, ''],
    ['PUT', `/groups/rooms/${room}/session/posts/42/helpfulness/x`, ''],
    ['DELETE', `/groups/rooms/${room}/session/posts/42/helpfulness`, ''],
    ['GET', '/admin', ''],
    ['GET', '/learning/sample-quiz/extra', ''],
    ['GET', `/groups/rooms/${room}/session/quiz/extra`, ''],
    ['GET', '/me/pro-request', ''],
    ['GET', '/learning/interactive-lab/', ''],
    ['GET', '/learning/interactive-lab/a/b', ''],
    ['GET', '/learning/interactive-lab/..%2Fprogress', ''],
    ['GET', '/learning/interactive-lab/Suites', ''],
    ['GET', `/learning/interactive-lab/${'a'.repeat(41)}`, ''],
    ['GET', '/learning/bac-practice/suites', ''],
    ['GET', '/learning/bac-practice/derivabilite/x', ''],
    ['POST', '/learning/bac-practice/derivabilite', ''],
    ['POST', '/learning/interactive-lab/derivabilite', ''],
    ['GET', '/learning/revision-pack/derivabilite', ''],
    ['POST', '/learning/revision-pack/suites', ''],
    ['POST', '/learning/revision-pack/derivabilite/x', ''],
    ['GET', '/learning/revision-demo/completion', ''],
    ['POST', '/learning/revision-demo/completion/x', ''],
    ['POST', '/learning/sample-quiz', ''],
    ['POST', '/me/pro-request/x', ''],
    ['PUT', '/me/pro-request', ''],
    ['DELETE', '/me/pro-request/x', ''],
    ['GET', '/groups/rooms/../auth/me', ''],
    ['DELETE', `/groups/rooms/${room}/members/a`, ''],
    ['HEAD', '/auth/me', ''],
    ['OPTIONS', '/auth/me', ''],
    ['constructor', '/auth/me', ''],
    ['get', '/auth/me', ''],
    ['GET', '/auth/me/', ''],
    ['GET', '/AUTH/ME', ''],
  ])('refuses %s %s%s', (method, pathname, search) => {
    expect(allowedEndpoint(method, pathname, search)).toBeNull();
  });
});

it('proxies the authenticated mind-map catalogue and chapter requests', () => {
  expect(allowedEndpoint('GET', '/learning/mind-maps', '')).toBe('/learning/mind-maps');
  expect(allowedEndpoint('POST', '/learning/mind-maps/derivabilite', '')).toBe('/learning/mind-maps/derivabilite');
  expect(allowedEndpoint('POST', '/learning/mind-maps', '')).toBeNull();
  expect(allowedEndpoint('GET', '/chapter-excerpts/math_4eme_se_002', '')).toBeNull();
});
