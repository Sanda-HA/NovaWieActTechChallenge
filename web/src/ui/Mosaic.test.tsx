import {fireEvent, render, screen, within} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {I18nRoot} from '../i18n';
import {Mosaic, nearestTile, type MosaicTile} from './Mosaic';

const rect = (x: number, y: number, width = 100, height = 100) => new DOMRect(x, y, width, height);

describe('nearestTile', () => {
  // 0 1 2
  // 3 4 4   (4 is wide)
  const grid = [rect(0, 0), rect(110, 0), rect(220, 0), rect(0, 110), rect(110, 110, 210)];

  it.each([
    [0, 'ArrowRight', 1],
    [1, 'ArrowLeft', 0],
    [1, 'ArrowDown', 4],
    [4, 'ArrowUp', 1],
    [3, 'ArrowRight', 4],
    [2, 'ArrowDown', 4],
  ] as const)('from %i, %s goes to %i', (from, key, to) => {
    expect(nearestTile(grid, from, key)).toBe(to);
  });

  it('stays put at an edge', () => {
    expect(nearestTile(grid, 2, 'ArrowRight')).toBe(2);
    expect(nearestTile(grid, 0, 'ArrowUp')).toBe(0);
  });

  it('follows reading order when nothing is laid out, mirrored under RTL', () => {
    const flat = [new DOMRect(), new DOMRect(), new DOMRect()];
    expect(nearestTile(flat, 1, 'ArrowRight')).toBe(2);
    expect(nearestTile(flat, 1, 'ArrowRight', true)).toBe(0);
    expect(nearestTile(flat, 1, 'ArrowLeft', true)).toBe(2);
    expect(nearestTile(flat, 2, 'ArrowDown')).toBe(2);
  });
});

describe('Mosaic keyboard', () => {
  const tiles: MosaicTile[] = [
    {id: 'a', label: 'Limites', level: 'weak'},
    {id: 'b', label: 'Dérivabilité', level: 'medium'},
    {id: 'c', label: 'Intégrales', level: 'unknown'},
  ];

  function renderMosaic(selectedId?: string) {
    const onSelect = vi.fn();
    render(
      <I18nRoot>
        <Mosaic tiles={tiles} label="Carte des chapitres" selectedId={selectedId} onSelect={onSelect} />
      </I18nRoot>,
    );
    const group = screen.getByRole('group', {name: 'Carte des chapitres'});
    return {group, buttons: within(group).getAllByRole('button'), onSelect};
  }

  it('is one tab stop, on the selected tile', () => {
    const {buttons} = renderMosaic('b');
    expect(buttons.map(button => button.tabIndex)).toStrictEqual([-1, 0, -1]);
    expect(buttons.map(button => button.getAttribute('aria-pressed'))).toStrictEqual(['false', 'true', 'false']);
  });

  it('arrows, Home and End move focus and the tab stop with it', () => {
    const {buttons} = renderMosaic();
    buttons[0]!.focus();
    fireEvent.keyDown(buttons[0]!, {key: 'ArrowRight'});
    expect(document.activeElement).toBe(buttons[1]);
    fireEvent.keyDown(buttons[1]!, {key: 'End'});
    expect(document.activeElement).toBe(buttons[2]);
    expect(buttons.map(button => button.tabIndex)).toStrictEqual([-1, -1, 0]);
    fireEvent.keyDown(buttons[2]!, {key: 'Home'});
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('names each tile with its chapter and mastery in words, and selects on press', () => {
    const {buttons, onSelect} = renderMosaic();
    expect(buttons[0]!.getAttribute('aria-label')).toBe('Limites, Fragile');
    fireEvent.click(buttons[1]!);
    expect(onSelect).toHaveBeenCalledWith('b');
  });
});
