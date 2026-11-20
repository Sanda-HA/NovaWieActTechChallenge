import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {Icon} from './icons';

describe('Icon', () => {
  it('is hidden from assistive tech without a label', () => {
    const {container} = render(<Icon name="book" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).toBeNull();
  });

  it('is an image named by its label', () => {
    render(<Icon name="check" label="Réponse juste" size={24} />);
    const svg = screen.getByRole('img', {name: 'Réponse juste'});
    expect(svg.getAttribute('aria-hidden')).toBeNull();
    expect(svg.getAttribute('width')).toBe('24');
  });

  it('draws the five jasmine petals turned around the centre', () => {
    const {container} = render(<Icon name="jasmine" />);
    const turns = [...container.querySelectorAll('path')].map(path => path.getAttribute('transform'));
    expect(turns).toEqual([
      'rotate(0 12 12)',
      'rotate(72 12 12)',
      'rotate(144 12 12)',
      'rotate(216 12 12)',
      'rotate(288 12 12)',
      null,
    ]);
  });
});
