import {createElement} from 'react';
import type {IconRegistry} from '@astryxdesign/core/Icon';
import {Glyph} from './Glyph';
import type {IconName} from './paths';

const glyph = (name: IconName) => createElement(Glyph, {name, size: '1em'});

// Astryx's own glyphs (Banner, Toast, Selector, Stepper…) drawn with the EdNova set.
// Names without an EdNova counterpart keep the Lucide artwork inherited from stone.
export const tesselleIcons: Partial<IconRegistry> = {
  close: glyph('x'),
  chevronDown: glyph('chevron-down'),
  chevronLeft: glyph('chevron-left'),
  chevronRight: glyph('chevron-right'),
  check: glyph('check'),
  success: glyph('check'),
  error: glyph('alert'),
  warning: glyph('alert'),
  info: glyph('info'),
  clock: glyph('clock'),
  copy: glyph('copy'),
  arrowUp: glyph('arrow-up'),
  eyeSlash: glyph('eye-off'),
  stop: glyph('stop'),
};
