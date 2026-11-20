// Generates the Tesselle theme for Astryx from EdNova's design tokens.
// Run from web/: `npm run theme` (this script, then `astryx theme build`).
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TOKENS_PATH = resolve(webRoot, 'theme-src/tokens.json');
export const TESSELLE_PATH = resolve(webRoot, 'src/theme/tesselle.ts');
export const EDNOVA_STYLEX_PATH = resolve(webRoot, 'src/theme/ednova.stylex.ts');

interface Pair {
  light: string;
  dark: string;
}
interface ColourToken {
  name: string;
  /** A pair, or an alias such as "{argile}". */
  value: Pair | string;
}
interface TypeStyle {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
}
interface Scalar {
  name: string;
  value: string;
}
export interface TokensFile {
  color: {tokens: ColourToken[]};
  type: {
    families: {display: string; text: string; math: string};
    groups: {name: string; family: string; styles: TypeStyle[]}[];
  };
  spacing: {tokens: Scalar[]};
  radius: {tokens: Scalar[]};
  shadow: {tokens: {name: string; value: Pair}[]};
  size: {tokens: Scalar[]};
  motion: {ease: string; durations: [number, number, number]};
}

export function readTokens(path: string = TOKENS_PATH): TokensFile {
  return JSON.parse(readFileSync(path, 'utf8')) as TokensFile;
}

/** Astryx colour role -> the EdNova token it takes its [light, dark] pair from. */
export const ASTRYX_COLOUR_ROLES: ReadonlyArray<readonly [role: string, ednova: string]> = [
  ['--color-background-body', 'ground'],
  ['--color-background-surface', 'surface'],
  ['--color-background-card', 'surface'],
  ['--color-background-muted', 'surface-sunken'],
  ['--color-track', 'surface-sunken'],
  ['--color-background-popover', 'surface-raised'],
  ['--color-border', 'line'],
  ['--color-skeleton', 'line'],
  ['--color-border-emphasized', 'line-strong'],
  ['--color-text-disabled', 'line-strong'],
  ['--color-icon-disabled', 'line-strong'],
  ['--color-text-primary', 'ink'],
  ['--color-icon-primary', 'ink'],
  ['--color-background-inverted', 'ink'],
  ['--color-text-secondary', 'ink-muted'],
  ['--color-icon-secondary', 'ink-muted'],

  ['--color-accent', 'argile'],
  ['--color-text-accent', 'link'],
  ['--color-icon-accent', 'argile'],
  ['--color-accent-muted', 'argile-soft'],
  ['--color-on-accent', 'on-argile'],
  ['--focus-outline-color', 'focus'],

  ['--color-success', 'faience'],
  ['--color-on-success', 'on-faience'],
  ['--color-success-muted', 'faience-soft'],
  ['--color-on-success-muted', 'faience'],
  ['--color-text-success', 'faience'],
  ['--color-icon-success', 'faience'],
  ['--color-border-success', 'faience'],

  ['--color-info', 'faience'],
  ['--color-on-info', 'on-faience'],
  ['--color-info-muted', 'surface-sunken'],
  ['--color-on-info-muted', 'ink'],
  ['--color-text-info', 'faience'],
  ['--color-icon-info', 'faience'],
  ['--color-border-info', 'faience'],

  ['--color-warning', 'ocre'],
  ['--color-on-warning', 'on-ocre'],
  ['--color-warning-muted', 'ocre-soft'],
  ['--color-on-warning-muted', 'ocre-ink'],
  ['--color-text-warning', 'ocre-ink'],
  ['--color-icon-warning', 'ocre-ink'],
  ['--color-border-warning', 'ocre-ink'],

  ['--color-error', 'harissa'],
  ['--color-on-error', 'on-harissa'],
  ['--color-error-muted', 'harissa-soft'],
  ['--color-on-error-muted', 'harissa'],
  ['--color-text-error', 'harissa'],
  ['--color-icon-error', 'harissa'],
  ['--color-border-error', 'harissa'],
  ['--color-background-error-inverted', 'harissa'],

  ['--color-background-orange', 'argile-soft'],
  ['--color-text-orange', 'argile'],
  ['--color-icon-orange', 'argile'],
  ['--color-border-orange', 'argile'],
  ['--color-background-teal', 'faience-soft'],
  ['--color-text-teal', 'faience'],
  ['--color-icon-teal', 'faience'],
  ['--color-border-teal', 'faience'],
  ['--color-background-green', 'faience-soft'],
  ['--color-text-green', 'faience'],
  ['--color-icon-green', 'faience'],
  ['--color-border-green', 'faience'],
  ['--color-background-yellow', 'ocre-soft'],
  ['--color-text-yellow', 'ocre-ink'],
  ['--color-icon-yellow', 'ocre-ink'],
  ['--color-border-yellow', 'ocre'],
  ['--color-background-red', 'harissa-soft'],
  ['--color-text-red', 'harissa'],
  ['--color-icon-red', 'harissa'],
  ['--color-border-red', 'harissa'],
  ['--color-background-gray', 'surface-sunken'],
  ['--color-text-gray', 'ink'],
  ['--color-icon-gray', 'ink-muted'],
  ['--color-border-gray', 'line-strong'],
  ['--color-background-blue', 'calm'],
  ['--color-text-blue', 'calm-ink'],
  ['--color-icon-blue', 'calm-accent'],
  ['--color-border-blue', 'calm-accent'],
];

/** Astryx roles drawn from an EdNova pair with an alpha suffix: translucent ink washes, scrims and shadow. */
const DERIVED_COLOUR_ROLES: ReadonlyArray<readonly [role: string, light: [string, string], dark: [string, string]]> = [
  ['--color-neutral', ['ink', '0F'], ['ink', '1A']],
  ['--color-overlay-hover', ['ink', '0D'], ['ink', '0D']],
  ['--color-overlay-pressed', ['ink', '1A'], ['ink', '1A']],
  ['--color-overlay', ['ink', '66'], ['surface-sunken', 'CC']],
  ['--color-shadow', ['ink', '1A'], ['surface-sunken', '80']],
];

const SPACING_ROLES: ReadonlyArray<readonly [string, string]> = [
  ['--spacing-0-5', 'grout'],
  ['--spacing-1', 'space-1'],
  ['--spacing-2', 'space-2'],
  ['--spacing-3', 'space-3'],
  ['--spacing-4', 'space-4'],
  ['--spacing-5', 'space-5'],
  ['--spacing-6', 'space-6'],
  ['--spacing-8', 'space-8'],
  ['--spacing-10', 'space-10'],
  ['--spacing-12', 'space-12'],
];

const RADIUS_ROLES: ReadonlyArray<readonly [string, string]> = [
  ['--radius-inner', 'radius-sm'],
  ['--radius-element', 'radius-md'],
  ['--radius-container', 'radius-lg'],
  ['--radius-chat', 'radius-lg'],
  ['--radius-page', 'radius-xl'],
  ['--radius-full', 'radius-full'],
];

const SIZE_ROLES: ReadonlyArray<readonly [string, string]> = [
  ['--size-element-sm', 'size-control-sm'],
  ['--size-element-md', 'size-control'],
  ['--size-element-lg', 'size-control-lg'],
];

/** Coarse pointers: every control reaches the touch target. */
const TOUCH_SIZE_ROLES: ReadonlyArray<readonly [string, string]> = [
  ['--size-element-sm', 'size-touch'],
  ['--size-element-md', 'size-touch'],
];

const SHADOW_ROLES: ReadonlyArray<readonly [string, string]> = [
  ['--shadow-low', 'shadow-raise'],
  ['--shadow-med', 'shadow-float'],
  ['--shadow-high', 'shadow-float'],
];

/** Astryx text role -> EdNova type style. Headings 4–6 take a text size at the heading weight. */
const TYPE_ROLES: ReadonlyArray<readonly [role: string, style: string, weight?: number]> = [
  ['display-1', 'display-xl'],
  ['display-2', 'display'],
  ['display-3', 'title'],
  ['heading-1', 'display'],
  ['heading-2', 'title'],
  ['heading-3', 'heading'],
  ['heading-4', 'body', 600],
  ['heading-5', 'label', 600],
  ['heading-6', 'caption', 600],
  ['body', 'body'],
  ['large', 'body-lg'],
  ['label', 'label'],
  ['supporting', 'caption'],
];

/** Under 640px the display-xl moment drops to display (tokens.json, display-xl usage). */
const NARROW_TYPE_ROLES: ReadonlyArray<readonly [string, string]> = [['display-1', 'display']];

type Value = string | [string, string];

function pairOf(tokens: TokensFile, name: string, seen: string[] = []): [string, string] {
  const token = tokens.color.tokens.find(candidate => candidate.name === name);
  if (!token) throw new Error(`tokens.json has no colour "${name}"`);
  if (typeof token.value === 'string') {
    const alias = /^\{([a-z-]+)\}$/.exec(token.value)?.[1];
    if (!alias || seen.includes(alias)) throw new Error(`Bad alias ${token.value} on ${name}`);
    return pairOf(tokens, alias, [...seen, name]);
  }
  return [token.value.light, token.value.dark];
}

export function colourPairs(tokens: TokensFile): Record<string, [string, string]> {
  return Object.fromEntries(tokens.color.tokens.map(token => [token.name, pairOf(tokens, token.name)]));
}

function scalar(group: {tokens: Scalar[]}, name: string): string {
  const token = group.tokens.find(candidate => candidate.name === name);
  if (!token) throw new Error(`tokens.json has no "${name}"`);
  return token.value;
}

function typeStyle(tokens: TokensFile, name: string): TypeStyle {
  for (const group of tokens.type.groups) {
    const style = group.styles.find(candidate => candidate.name === name);
    if (style) return style;
  }
  throw new Error(`tokens.json has no type style "${name}"`);
}

const px = (value: string): number => {
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value);
  if (!match?.[1]) throw new Error(`Expected a px value, got ${value}`);
  return Number(match[1]);
};
const rem = (value: string): string => `${+(px(value) / 16).toFixed(4)}rem`;
const ratio = (style: TypeStyle): string => String(+(px(style.lineHeight) / px(style.fontSize)).toFixed(4));

interface ShadowLayer {
  geometry: string;
  colour: string;
}
function layers(shadow: string): ShadowLayer[] {
  return shadow.split(/,\s*/).map(layer => {
    const parts = layer.trim().split(/\s+/);
    const colour = parts.pop();
    if (!colour?.startsWith('#')) throw new Error(`Shadow layer without a hex colour: ${layer}`);
    return {geometry: parts.join(' '), colour};
  });
}

/** One box-shadow for both modes: light-dark() per layer, and a transparent twin where the geometry differs. */
function shadowFor(pair: Pair): string {
  const light = layers(pair.light);
  const dark = layers(pair.dark);
  const out: string[] = [];
  for (let index = 0; index < Math.max(light.length, dark.length); index++) {
    const l = light[index];
    const d = dark[index];
    if (l && d && l.geometry === d.geometry) {
      out.push(`${l.geometry} light-dark(${l.colour}, ${d.colour})`);
      continue;
    }
    if (l) out.push(`${l.geometry} light-dark(${l.colour}, transparent)`);
    if (d) out.push(`${d.geometry} light-dark(transparent, ${d.colour})`);
  }
  return out.join(', ');
}

function shadowPair(tokens: TokensFile, name: string): Pair {
  const token = tokens.shadow.tokens.find(candidate => candidate.name === name);
  if (!token) throw new Error(`tokens.json has no shadow "${name}"`);
  return token.value;
}

/** focus-ring is "0 0 0 <gap> ground, 0 0 0 <gap + width> focus": Astryx draws it as an outline. */
function focusOutline(tokens: TokensFile): {width: string; offset: string} {
  const [gap, ring] = layers(shadowPair(tokens, 'focus-ring').light).map(layer => px(layer.geometry.split(' ')[3] ?? ''));
  if (gap === undefined || ring === undefined) throw new Error('focus-ring needs two layers');
  return {width: `${ring - gap}px`, offset: `${gap}px`};
}

function family(stack: string): {family: string; fallbacks: string} {
  const [first, ...rest] = stack.split(/,\s*/);
  return {family: (first ?? '').replace(/^"|"$/g, ''), fallbacks: rest.join(', ')};
}

function typeTokens(tokens: TokensFile, roles: ReadonlyArray<readonly [string, string, number?]>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [role, name, weight] of roles) {
    const style = typeStyle(tokens, name);
    out[`--text-${role}-size`] = rem(style.fontSize);
    out[`--text-${role}-weight`] = String(weight ?? style.fontWeight);
    out[`--text-${role}-leading`] = ratio(style);
  }
  return out;
}

const camel = (name: string): string => name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());

/** Every EdNova token as a theme-local custom property (`--en-<name>`). */
function localTokens(tokens: TokensFile): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const [name, pair] of Object.entries(colourPairs(tokens))) out[`--en-${name}`] = pair;
  for (const group of [tokens.spacing, tokens.radius, tokens.size]) {
    for (const token of group.tokens) out[`--en-${token.name}`] = token.value;
  }
  for (const token of tokens.shadow.tokens) out[`--en-${token.name}`] = shadowFor(token.value);
  out['--en-font-display'] = tokens.type.families.display;
  out['--en-font-text'] = tokens.type.families.text;
  out['--en-font-math'] = tokens.type.families.math;
  for (const group of tokens.type.groups) {
    for (const style of group.styles) {
      out[`--en-type-${style.name}-size`] = style.fontSize;
      out[`--en-type-${style.name}-leading`] = style.lineHeight;
      out[`--en-type-${style.name}-weight`] = String(style.fontWeight);
      out[`--en-type-${style.name}-tracking`] = style.letterSpacing ?? 'normal';
    }
  }
  out['--en-ease'] = tokens.motion.ease;
  tokens.motion.durations.forEach((ms, index) => (out[`--en-dur-${index + 1}`] = `${ms}ms`));
  return out;
}

function astryxTokens(tokens: TokensFile): Record<string, Value> {
  const pairs = colourPairs(tokens);
  const pick = (name: string): [string, string] => {
    const pair = pairs[name];
    if (!pair) throw new Error(`No colour ${name}`);
    return pair;
  };
  const out: Record<string, Value> = {};
  for (const [role, name] of ASTRYX_COLOUR_ROLES) out[role] = pick(name);
  for (const [role, [lightName, lightAlpha], [darkName, darkAlpha]] of DERIVED_COLOUR_ROLES) {
    out[role] = [`${pick(lightName)[0]}${lightAlpha}`, `${pick(darkName)[1]}${darkAlpha}`];
  }
  for (const [role, name] of SPACING_ROLES) out[role] = scalar(tokens.spacing, name);
  for (const [role, name] of RADIUS_ROLES) out[role] = scalar(tokens.radius, name);
  for (const [role, name] of SIZE_ROLES) out[role] = scalar(tokens.size, name);
  for (const [role, name] of SHADOW_ROLES) out[role] = shadowFor(shadowPair(tokens, name));
  const focus = focusOutline(tokens);
  out['--focus-outline-width'] = focus.width;
  out['--focus-outline-offset'] = focus.offset;
  Object.assign(out, typeTokens(tokens, TYPE_ROLES));
  out['--ease-standard'] = tokens.motion.ease;
  out['--ease-entrance'] = tokens.motion.ease;
  out['--ease-move'] = tokens.motion.ease;
  return out;
}

const literal = (value: Value): string =>
  typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : `[${literal(value[0])}, ${literal(value[1])}]`;
const key = (name: string): string => (/^[a-zA-Z_$][\w$]*$/.test(name) ? name : `'${name}'`);
function block(entries: Record<string, Value>, indent: string): string {
  return Object.entries(entries)
    .map(([name, value]) => `${indent}${key(name)}: ${literal(value)},`)
    .join('\n');
}

const HEADER = [
  '// Generated by web/scripts/tokens-to-theme.ts from web/theme-src/tokens.json. Do not edit by hand:',
  '// change tokens.json or the generator, then run `npm run theme` in web/.',
].join('\n');

export function renderTesselle(tokens: TokensFile): string {
  const body = family(tokens.type.families.text);
  const display = family(tokens.type.families.display);
  const touch: Record<string, Value> = {};
  for (const [role, name] of TOUCH_SIZE_ROLES) touch[role] = scalar(tokens.size, name);
  const typeRoot = typeTokens(tokens, TYPE_ROLES);
  return `${HEADER}
import {defineTheme} from '@astryxdesign/core/theme';
import {stoneTheme} from '@astryxdesign/theme-stone/built';
import {tesselleIcons} from '../ui/icons/registry';
import {tesselleComponents} from './tesselle.components';

export const tesselleTheme = defineTheme({
  name: 'tesselle',
  extends: stoneTheme,
  typography: {
    scale: {base: 16, ratio: 1.2},
    body: {family: '${body.family}', fallbacks: '${body.fallbacks}'},
    heading: {family: '${display.family}', fallbacks: '${display.fallbacks.replace(/'/g, "\\'")}', weights: {1: 'bold', 2: 'semibold', 3: 'semibold'}},
    code: {family: 'SF Mono', fallbacks: 'ui-monospace, Menlo, Consolas, monospace'},
  },
  motion: {fast: ${tokens.motion.durations[1]}, medium: ${tokens.motion.durations[2]}, ratio: ${tokens.motion.durations[0] / tokens.motion.durations[1]}},
  tokens: {
${block(astryxTokens(tokens), '    ')}
  },
  localTokens: {
${block(localTokens(tokens), '    ')}
  },
  adaptations: {
    rules: [
      {
        // Restates the type scale after stone's touch rule, which would otherwise regenerate it.
        when: {pointer: 'coarse', width: {below: 'lg'}},
        value: {
          typography: {scale: {base: 16, ratio: 1.2}},
          tokens: {
${block(typeRoot, '            ')}
          },
        },
      },
      {
        when: {pointer: 'coarse'},
        value: {tokens: {
${block(touch, '          ')}
        }},
      },
      {
        when: {width: {below: 'sm'}},
        value: {tokens: {
${block(typeTokens(tokens, NARROW_TYPE_ROLES), '          ')}
        }},
      },
    ],
  },
  components: tesselleComponents,
  icons: tesselleIcons,
});
`;
}

/** Colour tokens that no Astryx role reads: EdNova components reach them through `en`. */
export function ednovaOnlyColours(tokens: TokensFile): string[] {
  const used = new Set(ASTRYX_COLOUR_ROLES.map(([, name]) => name));
  for (const [, [light], [dark]] of DERIVED_COLOUR_ROLES) used.add(light).add(dark);
  return tokens.color.tokens.map(token => token.name).filter(name => !used.has(name));
}

export function renderEdnovaStylex(tokens: TokensFile): string {
  const names = Object.keys(localTokens(tokens)).map(name => name.slice('--en-'.length));
  const entries = names.map(name => `  ${camel(name)}: 'var(--en-${name})',`).join('\n');
  return `${HEADER}
// Every EdNova token by its own name, as a reference to the theme-local property Tesselle declares.
// Inside Astryx components prefer the Astryx role; reach for \`en\` where Astryx has no slot
// (tesserae, mastery, badge tiers, the mark, the mascot, the calm dusk, the type styles beyond its scale).
import * as stylex from '@stylexjs/stylex';

export const en = stylex.defineConsts({
${entries}
});
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const tokens = readTokens();
  writeFileSync(TESSELLE_PATH, renderTesselle(tokens));
  writeFileSync(EDNOVA_STYLEX_PATH, renderEdnovaStylex(tokens));
  console.log(`Wrote ${TESSELLE_PATH}\nWrote ${EDNOVA_STYLEX_PATH}`);
}
