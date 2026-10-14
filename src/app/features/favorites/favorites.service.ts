import { Injectable, computed, effect, signal } from '@angular/core';

import { FavoriteChargePoint, loadFavorites, saveFavorites } from './favorites.storage';

/**
 * Holds the favorite stations and charge points (connectors) of this browser.
 * Changes are saved to localStorage automatically.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly stationIds = signal<number[]>([]);
  private readonly chargePoints = signal<FavoriteChargePoint[]>([]);

  /**
   * Station ids to show in the favorites view. That is a station that is starred itself,
   * or one that holds a starred charge point.
   */
  readonly stationsInFavoritesView = computed(
    () => new Set([...this.stationIds(), ...this.chargePoints().map((point) => point.stationId)]),
  );

  /** Number of starred stations and starred charge points, shown on the favorites button. */
  readonly stationCount = computed(() => this.stationIds().length);
  readonly connectorCount = computed(() => this.chargePoints().length);

  constructor() {
    const stored = loadFavorites();
    this.stationIds.set(stored.stations);
    this.chargePoints.set(stored.chargePoints);

    effect(() => {
      saveFavorites({ stations: this.stationIds(), chargePoints: this.chargePoints() });
    });
  }

  isStationFavorite(stationId: number): boolean {
    return this.stationIds().includes(stationId);
  }

  isChargePointFavorite(stationId: number, chargePointId: number): boolean {
    return this.chargePoints().some(
      (point) => point.stationId === stationId && point.chargePointId === chargePointId,
    );
  }

  toggleStation(stationId: number): void {
    this.stationIds.update((ids) =>
      ids.includes(stationId) ? ids.filter((id) => id !== stationId) : [...ids, stationId],
    );
  }

  toggleChargePoint(stationId: number, chargePointId: number): void {
    this.chargePoints.update((points) =>
      this.isChargePointFavorite(stationId, chargePointId)
        ? points.filter((point) => !(point.stationId === stationId && point.chargePointId === chargePointId))
        : [...points, { stationId, chargePointId }],
    );
  }
}
