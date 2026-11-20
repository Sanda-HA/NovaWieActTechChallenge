import type {ThemeMode} from '@astryxdesign/core/theme';

const listeners = new Set<() => void>();
let mode: ThemeMode = 'system';

/** Jour/Nuit for this tab. `system` until the learner flips it, as in ui-preview. */
export const themeMode = {
  getSnapshot: (): ThemeMode => mode,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  set(next: ThemeMode) {
    if (next === mode) return;
    mode = next;
    for (const listener of listeners) listener();
  },
};
