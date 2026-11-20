import {createElement, type ReactElement} from 'react';
import {iconPaths, type IconDefinition, type IconName} from './paths';

export interface GlyphProps {
  name: IconName;
  size: number | string;
  label?: string;
  className?: string;
}

// No JSX and no StyleX: `astryx theme build` loads this module (through the icon registry) uncompiled.
export function Glyph({name, size, label, className}: GlyphProps): ReactElement {
  const definition: IconDefinition = iconPaths[name];
  const a11y = label ? {role: 'img', 'aria-label': label} : {'aria-hidden': true};
  return createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.75,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      focusable: 'false',
      className,
      ...a11y,
    },
    createElement(
      'g',
      {transform: definition.transform},
      definition.d.map((d, index) =>
        createElement('path', {
          key: index,
          d,
          transform: definition.rotate && index < 5 ? `rotate(${definition.rotate * index} 12 12)` : undefined,
        }),
      ),
    ),
  );
}
