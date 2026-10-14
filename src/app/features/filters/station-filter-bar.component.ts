import { Component, computed, input, output } from '@angular/core';
import { IonChip, IonLabel } from '@ionic/angular';

import { MARKER_STATUSES, StationFilters, hasActiveFilters, toggleValue } from './station-filters';
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
  imports: [IonChip, IonLabel],
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
  protected readonly anyActive = computed(() => hasActiveFilters(this.filters()));
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

  protected toggleStatus(status: MarkerStatus): void {
    this.filtersChange.emit({
      ...this.filters(),
      statuses: toggleValue(this.filters().statuses, status),
    });
  }

  protected toggleConnector(type: string): void {
    this.filtersChange.emit({
      ...this.filters(),
      connectorTypes: toggleValue(this.filters().connectorTypes, type),
    });
  }

  protected clear(): void {
    this.filtersChange.emit({ statuses: [], connectorTypes: [] });
  }
}
