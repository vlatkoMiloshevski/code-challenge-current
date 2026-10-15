import { Component, computed, input, output, signal } from '@angular/core';
import { IonButton, IonCheckbox, IonIcon, IonToggle } from '@ionic/angular';

import { MARKER_CONNECTORS, MARKER_STATUSES, StationFilters, hasActiveFilters } from './station-filters';
import { MarkerStatus } from '../map/station-geojson';
import { MarkerConnector } from '../../core/models/station.model';

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
  readonly filtersChange = output<StationFilters>();

  /** Favorites chip below the filters. Counts are shown when there are starred items. */
  readonly favoritesView = input(false);
  readonly favoritesToggled = output<void>();

  protected readonly statusOptions = MARKER_STATUSES;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly connectorOptions = MARKER_CONNECTORS;

  /** The filter groups can be collapsed to save room over the map. */
  protected readonly expanded = signal(false);
  protected readonly chevronIcon = computed(() =>
    this.expanded() ? '/assets/icons/chevron-up.svg' : '/assets/icons/chevron-down.svg',
  );
  protected readonly anyActive = computed(() => hasActiveFilters(this.filters()));

  protected isStatusSelected(status: MarkerStatus): boolean {
    return this.filters().statuses.includes(status);
  }

  protected isConnectorSelected(connector: MarkerConnector): boolean {
    return this.filters().connectors.includes(connector);
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

  protected setConnector(connector: MarkerConnector, checked: boolean): void {
    const current = this.filters().connectors;
    if (checked === current.includes(connector)) {
      return;
    }
    this.filtersChange.emit({
      ...this.filters(),
      connectors: checked ? [...current, connector] : current.filter((value) => value !== connector),
    });
  }

  protected clear(): void {
    this.filtersChange.emit({ statuses: [], connectors: [] });
  }
}
