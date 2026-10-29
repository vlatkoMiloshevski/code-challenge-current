import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonModal, IonSpinner, IonText, IonTitle, IonToolbar } from '@ionic/angular';

import { StationApiService } from '../core/services/station-api.service';
import { Station } from '../core/models/station.model';
import { GEOCODING } from '../core/config/geocoding.config';
import { GeocodeResult, GeocodingService } from '../core/services/geocoding.service';
import { syntheticStationsFor } from '../core/dev/synthetic-stations';
import { mediaQuery } from '../core/utils/media-query';
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
} from '../shared/url-state/station-url-state';

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
  private readonly geocoding = inject(GeocodingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly favorites = inject(FavoritesService);

  protected readonly isDesktop = mediaQuery(DESKTOP_QUERY);

  protected readonly stations = signal<Station[] | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly focusPoint = signal<GeocodeResult | null>(null);
  protected readonly locationMessage = signal<string | null>(null);

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
  protected readonly connectors = computed(() => connectorTypeNames(this.stations() ?? []));
  protected readonly visibleStations = computed(() => {
    const matching = filterStations(this.stations() ?? [], this.filters());
    if (!this.favoritesView()) {
      return matching;
    }
    const favoriteIds = this.favorites.stationsInFavoritesView();
    return matching.filter((station) => favoriteIds.has(station.id));
  });

  constructor() {
    this.load();

    // An address in the URL places the marker on the map; the search list stays closed.
    effect(() => {
      const query = this.searchText();
      untracked(() => this.resolveFocusPoint(query));
    });

    const stored = loadStationFilters();
    if (!hasFilterParams(this.route.snapshot.queryParamMap) && hasActiveFilters(stored)) {
      this.patchUrl(filtersToParams(stored), true);
    }
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

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

  protected onStationSelected(station: Station): void {
    this.patchUrl({ station: String(station.id) }, false);
  }

  protected closeDetails(): void {
    this.patchUrl({ station: null }, true);
  }

  protected onFiltersChange(filters: StationFilters): void {
    saveStationFilters(filters);
    this.patchUrl({ ...filtersToParams(filters), station: null }, true);
  }

  protected clearFilters(): void {
    this.onFiltersChange(NO_FILTERS);
  }

  protected onSearchChanged(text: string): void {
    this.patchUrl({ q: text || null }, true);
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

  private resolveFocusPoint(query: string): void {
    if (query.length < GEOCODING.minQueryLength || this.focusPoint()?.label === query) {
      return;
    }
    this.geocoding
      .search(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          // Ignore the answer when the URL has changed since the request started.
          if (this.searchText() !== query) {
            return;
          }
          const match = results.find((result) => result.label === query) ?? results[0];
          if (match) {
            this.focusPoint.set(match);
          }
        },
        // Without a result the page still works; only the marker is missing.
        error: () => undefined,
      });
  }

  protected onLocationError(message: string): void {
    this.locationMessage.set(message);
  }

  protected onLocationFound(): void {
    this.locationMessage.set(null);
  }

  private patchUrl(patch: Params, replaceUrl: boolean): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: patch,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}
