import { TestBed } from '@angular/core/testing';

import { FavoritesService } from './favorites.service';

function createService(): FavoritesService {
  TestBed.resetTestingModule();
  return TestBed.inject(FavoritesService);
}

describe('FavoritesService', () => {
  beforeEach(() => localStorage.clear());

  it('toggles a station on and off', () => {
    const service = createService();

    service.toggleStation(1);
    expect(service.isStationFavorite(1)).toBe(true);

    service.toggleStation(1);
    expect(service.isStationFavorite(1)).toBe(false);
  });

  it('treats the same charge point id on different stations as different favorites', () => {
    const service = createService();

    service.toggleChargePoint(1, 10);

    expect(service.isChargePointFavorite(1, 10)).toBe(true);
    expect(service.isChargePointFavorite(2, 10)).toBe(false);
  });

  it('includes a station in the favorites view when only one of its charge points is a favorite', () => {
    const service = createService();

    service.toggleChargePoint(7, 70);

    expect(service.stationsInFavoritesView().has(7)).toBe(true);
  });

  it('saves favorites to local storage and restores them in a new service instance', () => {
    const service = createService();
    service.toggleStation(3);
    service.toggleChargePoint(4, 40);
    TestBed.tick();

    const restored = createService();

    expect(restored.isStationFavorite(3)).toBe(true);
    expect(restored.isChargePointFavorite(4, 40)).toBe(true);
  });

  it('ignores invalid stored entries and removes duplicate stations', () => {
    localStorage.setItem(
      'favorites',
      JSON.stringify({
        stations: [5, 5, -1, 'x', 2.5],
        chargePoints: [{ stationId: 5, chargePointId: 50 }, { stationId: 'bad', chargePointId: 1 }, null],
      }),
    );

    const service = createService();

    expect(service.isStationFavorite(5)).toBe(true);
    expect(service.isStationFavorite(-1)).toBe(false);
    expect(service.isChargePointFavorite(5, 50)).toBe(true);
    expect(service.isChargePointFavorite(0, 1)).toBe(false);
  });
});
