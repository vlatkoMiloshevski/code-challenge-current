import { DestroyRef, Signal, inject, signal } from '@angular/core';

export function mediaQuery(query: string): Signal<boolean> {
  const destroyRef = inject(DestroyRef);
  const list = window.matchMedia(query);
  const matches = signal(list.matches);

  const onChange = (event: MediaQueryListEvent) => matches.set(event.matches);
  list.addEventListener('change', onChange);
  destroyRef.onDestroy(() => list.removeEventListener('change', onChange));

  return matches.asReadonly();
}
