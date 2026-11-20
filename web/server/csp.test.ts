// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {cspHeader} from './csp.ts';

describe('cspHeader', () => {
  it('serves the production policy verbatim', () => {
    expect(cspHeader('prod')).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'",
    );
  });

  it('adds the nonce to script-src only in dev', () => {
    expect(cspHeader('dev', 'abc123+/=')).toBe(
      "default-src 'self'; script-src 'self' 'nonce-abc123+/='; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'",
    );
  });

  it.each(['', "x'; script-src *", 'a b'])('refuses a dev nonce of %j', nonce => {
    expect(() => cspHeader('dev', nonce)).toThrow();
  });
});
