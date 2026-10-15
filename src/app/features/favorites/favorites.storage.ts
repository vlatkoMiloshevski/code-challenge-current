export interface FavoriteChargePoint {
  stationId: number;
  chargePointId: number;
}

export interface StoredFavorites {
  stations: number[];
  chargePoints: FavoriteChargePoint[];
}

export const NO_FAVORITES: StoredFavorites = { stations: [], chargePoints: [] };

const STORAGE_KEY = 'favorites';

function isId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function parseFavorites(raw: string | null): StoredFavorites {
  if (!raw) {
    return NO_FAVORITES;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) {
      return NO_FAVORITES;
    }
    const { stations, chargePoints } = value as Record<string, unknown>;
    const stationIds = Array.isArray(stations) ? stations.filter(isId) : [];
    const points = Array.isArray(chargePoints)
      ? chargePoints.filter(
          (point): point is FavoriteChargePoint =>
            typeof point === 'object' &&
            point !== null &&
            isId((point as FavoriteChargePoint).stationId) &&
            isId((point as FavoriteChargePoint).chargePointId),
        )
      : [];
    return { stations: [...new Set(stationIds)], chargePoints: points };
  } catch {
    return NO_FAVORITES;
  }
}

export function loadFavorites(): StoredFavorites {
  try {
    return parseFavorites(localStorage.getItem(STORAGE_KEY));
  } catch {
    return NO_FAVORITES;
  }
}

export function saveFavorites(favorites: StoredFavorites): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
  }
}
