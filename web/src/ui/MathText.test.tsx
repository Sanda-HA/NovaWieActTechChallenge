import {render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {MathText} from './MathText';

describe('MathText', () => {
  it('typesets a formula with KaTeX, left to right', () => {
    const {container} = render(<MathText text="$f'(x)$" />);
    const katex = container.querySelector('.katex');
    expect(katex).not.toBeNull();
    expect(katex?.closest('[dir="ltr"]')).not.toBeNull();
  });

  it('keeps plain text as it is', () => {
    const {container} = render(<MathText text="pas de maths" />);
    expect(container.querySelector('.katex')).toBeNull();
    expect(container.textContent).toBe('pas de maths');
  });

  it('keeps an escaped dollar as text and sets $$…$$ as display maths', () => {
    const {container} = render(<MathText text="Prix : 3 \$. $$x^2$$" />);
    expect(container.textContent).toContain('Prix : 3 $.');
    expect(container.querySelector('.katex-display')).not.toBeNull();
  });

  it('keeps the punctuation that follows a formula on its line', () => {
    const {container} = render(<MathText text="Soit $x$, un réel." />);
    const glue = container.querySelector('[dir="ltr"]')?.parentElement;
    expect(glue?.textContent?.endsWith(',')).toBe(true);
  });
});
