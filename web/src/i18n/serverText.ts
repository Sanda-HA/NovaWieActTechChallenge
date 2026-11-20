import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
import {generateMessageId} from '@lingui/message-utils/generateMessageId';

const normalize = (text: string): string => text.replace(/[\s  ]+/gu, ' ').trim();

const EXPLANATION_PREFIX = 'Quelle explication préfères-tu pour ';

/**
 * French text that comes from the backend, not from a component. The catalog holds whitespace-normalised
 * French keyed by its hash, so a known sentence is found that way; anything else is shown as it came.
 */
export function translateServerText(i18n: I18n, text: string): string {
  if (i18n.locale === 'fr') return text;
  const key = normalize(text);
  const id = generateMessageId(key);
  if (id in i18n.messages) return i18n._({id, message: key});
  if (key.startsWith(EXPLANATION_PREFIX)) {
    const message = `${EXPLANATION_PREFIX}{topic}`;
    return i18n._({id: generateMessageId(message), message, values: {topic: translateServerText(i18n, key.slice(EXPLANATION_PREFIX.length))}});
  }
  return text;
}

export function useServerText(): (text: string) => string {
  const {i18n} = useLingui();
  return text => translateServerText(i18n, text);
}
