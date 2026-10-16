import { Injectable, computed, effect, signal } from '@angular/core';

import { FavoriteChargePoint, loadFavorites, saveFavorites } from './favorites.storage';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly stationIds = signal<number[]>([]);
  private readonly chargePoints = signal<FavoriteChargePoint[]>([]);

  readonly stationsInFavoritesView = computed(
    () => new Set([...this.stationIds(), ...this.chargePoints().map((point) => point.stationId)]),
  );

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
