// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {accountTransition} from './account';
import type {AccountEvent} from './types';

describe('registration', () => {
  it('registration and sign-in are separate; double submit is ignored', () => {
    let state = accountTransition('idle', {type:'SUBMIT'});
    expect(state).toBe('registering');
    expect(accountTransition(state, {type:'SUBMIT'})).toBe(state);
    state = accountTransition(state, {type:'REGISTER_OK'});
    expect(state).toBe('login_needed');
    state = accountTransition(state, {type:'SUBMIT'});
    expect(state).toBe('logging_in');
    expect(accountTransition(state, {type:'LOGIN_OK', access_token:'valid', token_type:'bearer'})).toBe('signed_in');
  });

  it('failed or expired login retries only login, never account creation', () => {
    expect(accountTransition('logging_in', {type:'LOGIN_FAILED'})).toBe('login_failed');
    expect(accountTransition('login_failed', {type:'SUBMIT'})).toBe('logging_in');
    expect(accountTransition('logging_in', {type:'LOGIN_OK', access_token:''} as AccountEvent)).toBe('login_failed');
    expect(accountTransition('logging_in', {type:'CREDENTIALS_EXPIRED'})).toBe('login_failed');
  });

  it('duplicate and registration error retain form; password never becomes state', () => {
    expect(accountTransition('registering', {type:'DUPLICATE'})).toBe('duplicate');
    expect(accountTransition('registering', {type:'REGISTER_FAILED'})).toBe('register_failed');
    expect(accountTransition('duplicate', {type:'SUBMIT', password:'not stored'} as AccountEvent)).toBe('registering');
  });
});
