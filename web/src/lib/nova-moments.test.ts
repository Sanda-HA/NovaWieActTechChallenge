import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {useGreetingMood} from './nova-moments';

afterEach(() => localStorage.clear());

function mount(initial: number | undefined) {
  return renderHook(({days}: {days: number | undefined}) => useGreetingMood(days), {initialProps: {days: initial}});
}

describe('greeting mood', () => {
  it('does not cheer when home loads on a milestone day', () => {
    localStorage.setItem('ednova.nova-hello', '1');
    expect(mount(7).result.current).toBe('idle');
  });

  it('cheers when the streak rises to a milestone, once', () => {
    localStorage.setItem('ednova.nova-hello', '1');
    const {result, rerender} = mount(6);
    expect(result.current).toBe('idle');
    act(() => rerender({days: 7}));
    expect(result.current).toBe('cheer');
    expect(localStorage.getItem('ednova.nova-streak-7')).toBe('1');
    act(() => rerender({days: 6}));
    act(() => rerender({days: 7}));
    expect(result.current).toBe('cheer');
    expect(localStorage.getItem('ednova.nova-streak-7')).toBe('1');
  });

  it('stays quiet when a milestone was already celebrated', () => {
    localStorage.setItem('ednova.nova-hello', '1');
    localStorage.setItem('ednova.nova-streak-3', '1');
    const {result, rerender} = mount(2);
    act(() => rerender({days: 3}));
    expect(result.current).toBe('idle');
  });

  it('waves the first time on this device, once streak data arrives', () => {
    const {result, rerender} = mount(undefined);
    expect(result.current).toBe('idle');
    act(() => rerender({days: 4}));
    expect(result.current).toBe('wave');
  });
});
