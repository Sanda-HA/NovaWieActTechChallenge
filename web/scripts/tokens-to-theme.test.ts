// @vitest-environment node
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {tesselleTheme} from '../src/theme/built/tesselle.js';
import {
  ASTRYX_COLOUR_ROLES,
  EDNOVA_STYLEX_PATH,
  TESSELLE_PATH,
  colourPairs,
  readTokens,
  renderEdnovaStylex,
  renderTesselle,
} from './tokens-to-theme.ts';

const tokens = readTokens();
const colourNames = tokens.color.tokens.map(token => token.name);

function rawPair(name: string): [string, string] {
  const token = tokens.color.tokens.find(candidate => candidate.name === name);
  if (!token) throw new Error(`No token ${name}`);
  if (typeof token.value === 'string') return rawPair(token.value.replace(/^\{|\}$/g, ''));
  return [token.value.light, token.value.dark];
}

describe('tokens-to-theme', () => {
  it('reads every colour token from tokens.json as a [light, dark] pair', () => {
    const pairs = colourPairs(tokens);
    expect(Object.keys(pairs)).toEqual(colourNames);
    for (const name of colourNames) expect(pairs[name]).toEqual(rawPair(name));
  });

  it('gives the built Tesselle theme the same pair for every colour token, and no other colour', () => {
    const local = tesselleTheme.localTokens ?? {};
    for (const name of colourNames) {
      const [light, dark] = rawPair(name);
      expect(local[`--en-${name}`], name).toBe(`light-dark(${light}, ${dark})`);
    }
    const colourLocals = Object.keys(local).filter(key => colourNames.includes(key.slice('--en-'.length)));
    expect(colourLocals).toHaveLength(colourNames.length);
  });

  it('maps the Astryx colour roles onto the EdNova pairs', () => {
    for (const [role, name] of ASTRYX_COLOUR_ROLES) {
      const [light, dark] = rawPair(name);
      expect(tesselleTheme.tokens[role], role).toBe(`light-dark(${light}, ${dark})`);
    }
  });

  it('carries the spacing, radius and size tokens verbatim', () => {
    const local = tesselleTheme.localTokens ?? {};
    for (const group of [tokens.spacing, tokens.radius, tokens.size]) {
      for (const token of group.tokens) expect(local[`--en-${token.name}`], token.name).toBe(token.value);
    }
  });

  it('matches the committed generated files', () => {
    expect(readFileSync(TESSELLE_PATH, 'utf8')).toBe(renderTesselle(tokens));
    expect(readFileSync(EDNOVA_STYLEX_PATH, 'utf8')).toBe(renderEdnovaStylex(tokens));
  });
});
