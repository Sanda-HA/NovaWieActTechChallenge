import type {Messages} from '@lingui/core';

const NNBSP = '\u202f';
const NBSP = '\u00a0';

/** French typography: a narrow no-break space before ? ! ; and a no-break space before :, so they never wrap alone. */
export const frenchSpace = (text: string): string =>
  text.replace(/ ([?!;])/g, `${NNBSP}$1`).replace(/ :/g, `${NBSP}:`);

type Node = unknown;
const walk = (node: Node): Node =>
  typeof node === 'string'
    ? frenchSpace(node)
    : Array.isArray(node)
      ? node.map(walk)
      : node && typeof node === 'object'
        ? Object.fromEntries(Object.entries(node).map(([key, value]) => [key, walk(value)]))
        : node;

/**
 * The catalog ids keep plain spaces (they are the French source and the e2e locators), so the spacing is
 * applied to the compiled French messages only, string parts included inside plurals and selects.
 */
export const withFrenchSpacing = (messages: Messages): Messages => walk(messages) as Messages;
