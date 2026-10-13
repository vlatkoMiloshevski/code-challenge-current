import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonModal,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { StationApiService } from '../core/services/station-api.service';
import { Station } from '../core/models/station.model';
import { mediaQuery } from '../core/ui/media-query';
import { StationMapComponent } from '../features/map/station-map.component';
import { StationDetailsComponent } from '../features/station-details/station-details.component';
import { StationFilterBarComponent } from '../features/filters/station-filter-bar.component';
import { AddressSearchComponent } from '../features/search/address-search.component';
import { GeocodeResult } from '../core/services/geocoding.service';
import { NO_FILTERS, StationFilters, connectorTypeNames, filterStations } from '../features/filters/station-filters';
import { loadStationFilters, saveStationFilters } from '../features/filters/station-filter.storage';

/** Below this width the details open in an ion-modal instead of a side panel. */
const DESKTOP_QUERY = '(min-width: 768px)';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    IonButton,
    IonText,
    IonModal,
    StationMapComponent,
    StationDetailsComponent,
    StationFilterBarComponent,
    AddressSearchComponent,
  ],
})
export class HomePage {
  private readonly stationApi = inject(StationApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isDesktop = mediaQuery(DESKTOP_QUERY);

  /** null until the first successful response. */
  protected readonly stations = signal<Station[] | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedStation = signal<Station | null>(null);

  protected readonly filters = signal<StationFilters>(loadStationFilters());
  protected readonly connectorTypes = computed(() => connectorTypeNames(this.stations() ?? []));
  protected readonly visibleStations = computed(() => filterStations(this.stations() ?? [], this.filters()));

  /** Set after an address is picked. The map flies there and marks it. */
  protected readonly focusPoint = signal<GeocodeResult | null>(null);
  /** Shown under the search when the browser cannot provide the user's location. */
  protected readonly locationMessage = signal<string | null>(null);

  constructor() {
    this.load();

    effect(() => saveStationFilters(this.filters()));
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.stationApi
      .getStations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stations) => {
          this.stations.set(stations);
          this.loading.set(false);
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.loading.set(false);
        },
      });
  }

  protected onStationSelected(station: Station): void {
    this.selectedStation.set(station);
  }

  protected closeDetails(): void {
    this.selectedStation.set(null);
  }

  protected onFiltersChange(filters: StationFilters): void {
    this.filters.set(filters);
    // Changing filters starts a new browsing context, so a previously opened station is closed.
    this.closeDetails();
  }

  protected clearFilters(): void {
    this.filters.set(NO_FILTERS);
  }

  protected onAddressSelected(result: GeocodeResult): void {
    this.focusPoint.set(result);
  }

  protected onLocationError(message: string): void {
    this.locationMessage.set(message);
  }

  protected onLocationFound(): void {
    this.locationMessage.set(null);
  }
}
