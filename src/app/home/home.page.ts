import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
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
import { GeocodeResult } from '../core/services/geocoding.service';
import { syntheticStationsFor } from '../core/dev/synthetic-stations';
import { mediaQuery } from '../core/ui/media-query';
import { StationMapComponent } from '../features/map/station-map.component';
import { StationDetailsComponent } from '../features/station-details/station-details.component';
import { StationFilterBarComponent } from '../features/filters/station-filter-bar.component';
import { AddressSearchComponent } from '../features/search/address-search.component';
import {
  NO_FILTERS,
  StationFilters,
  connectorTypeNames,
  filterStations,
  hasActiveFilters,
} from '../features/filters/station-filters';
import { loadStationFilters, saveStationFilters } from '../features/filters/station-filter.storage';
import { FavoritesService } from '../features/favorites/favorites.service';
import {
  FAVORITES_VIEW,
  filtersToParams,
  hasFilterParams,
  isFavoritesView,
  parseFilters,
  parseStationId,
} from '../features/url-state/station-url-state';

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly favorites = inject(FavoritesService);

  protected readonly isDesktop = mediaQuery(DESKTOP_QUERY);

  /** null until the first successful response. */
  protected readonly stations = signal<Station[] | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Set after an address is picked. The map flies there and marks it. */
  protected readonly focusPoint = signal<GeocodeResult | null>(null);
  /** Shown under the search when the browser cannot provide the user's location. */
  protected readonly locationMessage = signal<string | null>(null);

  // The URL is the source of truth for the page state. Links to a station, search or filter reproduce the same view.
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly filters = computed(() => parseFilters(this.params()));
  protected readonly filtersActive = computed(() => hasActiveFilters(this.filters()));
  protected readonly searchText = computed(() => this.params().get('q') ?? '');
  protected readonly favoritesView = computed(() => isFavoritesView(this.params()));
  protected readonly selectedStation = computed(() => {
    const id = parseStationId(this.params());
    return id === null ? null : (this.stations()?.find((station) => station.id === id) ?? null);
  });

  protected readonly hasFavorites = computed(() => this.favorites.stationsInFavoritesView().size > 0);
  protected readonly connectorTypes = computed(() => connectorTypeNames(this.stations() ?? []));
  /** The favorites view shows every favorite station and ignores the filters. */
  protected readonly visibleStations = computed(() => {
    const all = this.stations() ?? [];
    if (this.favoritesView()) {
      const favoriteIds = this.favorites.stationsInFavoritesView();
      return all.filter((station) => favoriteIds.has(station.id));
    }
    return filterStations(all, this.filters());
  });

  constructor() {
    this.load();

    // The first visit with stored filters writes them into the URL, so the address bar shows them.
    const stored = loadStationFilters();
    if (!hasFilterParams(this.route.snapshot.queryParamMap) && hasActiveFilters(stored)) {
      this.patchUrl(filtersToParams(stored), true);
    }
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    // Dev only: ?synthetic=<count> replaces the API data with generated stations, for performance checks.
    // In production builds this function always returns null (see synthetic-stations.prod.ts).
    const synthetic = syntheticStationsFor(this.route.snapshot.queryParamMap.get('synthetic'));
    if (synthetic) {
      this.stations.set(synthetic);
      this.loading.set(false);
      return;
    }

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

  /** Pushes a history entry, so the back button closes the station. */
  protected onStationSelected(station: Station): void {
    this.patchUrl({ station: String(station.id) }, false);
  }

  protected closeDetails(): void {
    this.patchUrl({ station: null }, true);
  }

  protected onFiltersChange(filters: StationFilters): void {
    saveStationFilters(filters);
    // Changing filters starts a new browsing context, so a previously opened station is closed.
    this.patchUrl({ ...filtersToParams(filters), station: null }, true);
  }

  protected clearFilters(): void {
    this.onFiltersChange(NO_FILTERS);
  }

  protected onSearchChanged(text: string): void {
    this.patchUrl({ q: text || null }, true);
    // Clearing the search also clears the chosen address, so the map returns to its earlier view.
    if (!text) {
      this.focusPoint.set(null);
    }
  }

  protected toggleFavoritesView(): void {
    this.patchUrl({ view: this.favoritesView() ? null : FAVORITES_VIEW }, true);
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

  /** Changes only the given parameters. A null value removes that parameter. */
  private patchUrl(patch: Params, replaceUrl: boolean): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: patch,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
