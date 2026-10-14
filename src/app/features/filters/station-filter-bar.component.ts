import { Component, computed, input, output, signal } from '@angular/core';
import { IonButton, IonCheckbox, IonIcon, IonToggle } from '@ionic/angular';

import { MARKER_STATUSES, StationFilters, hasActiveFilters } from './station-filters';
import { MarkerStatus } from '../map/station-geojson';

const STATUS_LABELS: Record<MarkerStatus, string> = {
  available: 'Available',
  full: 'Full',
  closed: 'Closed',
};

@Component({
  selector: 'app-station-filter-bar',
  templateUrl: 'station-filter-bar.component.html',
  styleUrl: 'station-filter-bar.component.scss',
  imports: [IonButton, IonCheckbox, IonIcon, IonToggle],
})
export class StationFilterBarComponent {
  readonly filters = input.required<StationFilters>();
  readonly connectorTypes = input.required<readonly string[]>();
  readonly filtersChange = output<StationFilters>();

  /** Favorites chip below the filters. Counts are shown when there are starred items. */
  readonly favoritesView = input(false);
  readonly favoriteStationCount = input(0);
  readonly favoriteConnectorCount = input(0);
  readonly favoritesToggled = output<void>();

  protected readonly statusOptions = MARKER_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;

  /** The filter groups can be collapsed to save room over the map. */
  protected readonly expanded = signal(false);
  protected readonly chevronIcon = computed(() =>
    this.expanded() ? '/assets/icons/chevron-up.svg' : '/assets/icons/chevron-down.svg',
  );
  protected readonly anyActive = computed(() => hasActiveFilters(this.filters()));
  protected readonly activeCount = computed(
    () => this.filters().statuses.length + this.filters().connectorTypes.length,
  );

  protected readonly favoritesLabel = computed(() => {
    const stations = this.favoriteStationCount();
    const connectors = this.favoriteConnectorCount();
    return stations + connectors > 0
      ? `Favorites (stations: ${stations}, connectors: ${connectors})`
      : 'Favorites';
  });

  protected isStatusSelected(status: MarkerStatus): boolean {
    return this.filters().statuses.includes(status);
  }

  protected isConnectorSelected(type: string): boolean {
    return this.filters().connectorTypes.includes(type);
  }

  // Emits only when the switch differs from the current view, so a programmatic update does not toggle back.
  protected onFavoritesSwitch(checked: boolean): void {
    if (checked !== this.favoritesView()) {
      this.favoritesToggled.emit();
    }
  }

  protected toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }

  // The checkbox events give the new checked state. Setting the same state again emits nothing,
  // so programmatic updates of [checked] do not loop back into a filter change.
  protected setStatus(status: MarkerStatus, checked: boolean): void {
    const current = this.filters().statuses;
    if (checked === current.includes(status)) {
      return;
    }
    this.filtersChange.emit({
      ...this.filters(),
      statuses: checked ? [...current, status] : current.filter((value) => value !== status),
    });
  }

  protected setConnector(type: string, checked: boolean): void {
    const current = this.filters().connectorTypes;
    if (checked === current.includes(type)) {
      return;
    }
    this.filtersChange.emit({
      ...this.filters(),
      connectorTypes: checked ? [...current, type] : current.filter((value) => value !== type),
    });
  }

  protected clear(): void {
    this.filtersChange.emit({ statuses: [], connectorTypes: [] });
  }
}
