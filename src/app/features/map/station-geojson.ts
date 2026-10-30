import { Station } from '../../core/models/station.model';

export type MarkerStatus = 'available' | 'full' | 'closed';

export interface StationFeatureProperties {
  id: number;
  name: string;
  status: MarkerStatus;
  availableBoxes: number;
  totalBoxes: number;
  stackKey: string;
  stack: number;
}

export interface StationFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: StationFeatureProperties;
}

export interface StationFeatureCollection {
  type: 'FeatureCollection';
  features: StationFeature[];
}

export function markerStatus(station: Station): MarkerStatus {
  if (!station.isOpen) {
    return 'closed';
  }
  return station.boxes.available > 0 ? 'available' : 'full';
}

export type LngLatBounds = [[number, number], [number, number]];

export function stationsBounds(stations: readonly Station[]): LngLatBounds | null {
  if (stations.length === 0) {
    return null;
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const station of stations) {
    minLng = Math.min(minLng, station.longitude);
    minLat = Math.min(minLat, station.latitude);
    maxLng = Math.max(maxLng, station.longitude);
    maxLat = Math.max(maxLat, station.latitude);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

// Stations with the same coordinates share a stack key. They are drawn on top of each other.
export function stackKey(station: Station): string {
  return `${station.longitude},${station.latitude}`;
}

export function stationsToFeatureCollection(stations: readonly Station[]): StationFeatureCollection {
  const stackSizes = new Map<string, number>();
  for (const station of stations) {
    const key = stackKey(station);
    stackSizes.set(key, (stackSizes.get(key) ?? 0) + 1);
  }
  return {
    type: 'FeatureCollection',
    features: stations.map((station) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [station.longitude, station.latitude] },
      properties: {
        id: station.id,
        name: station.name,
        status: markerStatus(station),
        availableBoxes: station.boxes.available,
        totalBoxes: station.boxes.total,
        stackKey: stackKey(station),
        stack: stackSizes.get(stackKey(station)) ?? 1,
      },
    })),
  };
}
