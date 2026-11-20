import {Heading} from '@astryxdesign/core/Heading';
import type {ReactNode} from 'react';

/** The page h1 every screen starts with; placeholders show only this until their own task. */
export function ScreenTitle({children}: {children: ReactNode}): React.JSX.Element {
  return (
    <Heading level={1} type="display-3">
      {children}
    </Heading>
  );
}
