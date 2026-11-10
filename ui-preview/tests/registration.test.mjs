import test from 'node:test';
import assert from 'node:assert/strict';
import {accountTransition} from '../src/account.mjs';
test('registration and sign-in are separate; double submit is ignored',()=>{
 let state=accountTransition('idle',{type:'SUBMIT'});
 assert.equal(state,'registering');
 assert.equal(accountTransition(state,{type:'SUBMIT'}),state);
 state=accountTransition(state,{type:'REGISTER_OK'});
 assert.equal(state,'login_needed');
 state=accountTransition(state,{type:'SUBMIT'});
 assert.equal(state,'logging_in');
 assert.equal(accountTransition(state,{type:'LOGIN_OK',access_token:'valid',token_type:'bearer'}),'signed_in');
});
test('failed or expired login retries only login, never account creation',()=>{
 assert.equal(accountTransition('logging_in',{type:'LOGIN_FAILED'}),'login_failed');
 assert.equal(accountTransition('login_failed',{type:'SUBMIT'}),'logging_in');
 assert.equal(accountTransition('logging_in',{type:'LOGIN_OK',access_token:''}),'login_failed');
 assert.equal(accountTransition('logging_in',{type:'CREDENTIALS_EXPIRED'}),'login_failed');
});
test('duplicate and registration error retain form; password never becomes state',()=>{
 assert.equal(accountTransition('registering',{type:'DUPLICATE'}),'duplicate');
 assert.equal(accountTransition('registering',{type:'REGISTER_FAILED'}),'register_failed');
 assert.equal(accountTransition('duplicate',{type:'SUBMIT',password:'not stored'}),'registering');
});
