import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi, signIn} from '../src/api.mjs';

test('a failed auto-login leaves registration complete for the next attempt', async () => {
  const calls = [];
  const api = createApi({fetchImpl: async (url, options) => {
    calls.push([url, options]);
    if (calls.length === 1) return Response.json({}, {status: 201});
    if (calls.length === 2) return Response.json({}, {status: 401});
    return Response.json({access_token: 'example', token_type: 'bearer'});
  }});
  let created = false;
  const submit = () => signIn(api, {login: created, username: 'eleve01', password: 'test-only', onCreated: () => {created = true;}});
  await assert.rejects(submit, {status: 401});
  await submit();
  assert.deepEqual(calls.map(([url]) => url), ['/api/auth/register', '/api/auth/login', '/api/auth/login']);
  assert.equal(calls[2][1].body.get('username'), 'eleve01');
});
