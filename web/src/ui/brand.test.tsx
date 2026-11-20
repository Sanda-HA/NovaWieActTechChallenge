import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {Mark} from './Mark';
import {Mascot} from './Mascot';
import {MasteryTessera} from './MasteryTessera';

describe('Mark', () => {
  it('is named Nova by default and decorative with an empty label', () => {
    render(<Mark />);
    expect(screen.getByRole('img', {name: 'Nova'})).toBeTruthy();
    const {container} = render(<Mark label="" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('drops the warm fold in mono', () => {
    const {container} = render(<Mark tone="mono" />);
    expect(container.querySelectorAll('path')).toHaveLength(1);
  });
});

describe('Mascot', () => {
  it('is decorative without a label and keeps its gradient ids unique', () => {
    const {container} = render(
      <>
        <Mascot mood="idle" />
        <Mascot mood="thinking" label="Nova réfléchit" />
      </>,
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs[0]?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('img', {name: 'Nova réfléchit'})).toBeTruthy();
    const ids = [...container.querySelectorAll('[id]')].map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('MasteryTessera', () => {
  it.each([
    ['unknown', 'Pas encore évalué', 0],
    ['weak', 'Fragile', 1],
    ['medium', 'En route', 2],
    ['strong', 'Solide', 4],
  ] as const)('names %s and fills its tesserae', (level, name, filled) => {
    const {container} = render(<MasteryTessera level={level} />);
    expect(screen.getByRole('img', {name})).toBeTruthy();
    expect(container.querySelectorAll('rect[data-filled="true"]')).toHaveLength(filled);
  });
});
