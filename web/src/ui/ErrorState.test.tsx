import {act, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {I18nRoot} from '../i18n';
import {ErrorBanner} from './ErrorBanner';
import {ErrorState} from './ErrorState';

afterEach(() => vi.useRealTimers());

describe('ErrorBanner', () => {
  it('shows the custom message and retries only when asked, with no countdown', () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    render(
      <I18nRoot>
        <ErrorBanner message="Chargement indisponible. Réessaie." onRetry={onRetry} />
      </I18nRoot>,
    );
    expect(screen.getByText('Chargement indisponible. Réessaie.')).toBeTruthy();
    act(() => vi.advanceTimersByTime(120_000));
    expect(onRetry).not.toHaveBeenCalled();
    expect(screen.queryByText(/\d+\s*s\b/)).toBeNull();
    act(() => screen.getByRole('button', {name: 'Réessayer'}).click());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has no retry button without a handler', () => {
    render(
      <I18nRoot>
        <ErrorBanner message="Vérification indisponible" />
      </I18nRoot>,
    );
    expect(screen.getByText('Vérification indisponible')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ErrorState', () => {
  it('fills the area with the message and a retry button', () => {
    const onRetry = vi.fn();
    render(
      <I18nRoot>
        <ErrorState message="Chargement indisponible. Réessaie." onRetry={onRetry} />
      </I18nRoot>,
    );
    act(() => screen.getByRole('button', {name: 'Réessayer'}).click());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
