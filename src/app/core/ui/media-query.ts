import { DestroyRef, Signal, inject, signal } from '@angular/core';

/**
 * Signal that tracks whether a CSS media query currently matches.
 * Must be called in an injection context (constructor or field initializer).
 */
export function mediaQuery(query: string): Signal<boolean> {
  const destroyRef = inject(DestroyRef);
  const list = window.matchMedia(query);
  const matches = signal(list.matches);

  const onChange = (event: MediaQueryListEvent) => matches.set(event.matches);
  list.addEventListener('change', onChange);
  destroyRef.onDestroy(() => list.removeEventListener('change', onChange));

  return matches.asReadonly();
}
