import { Station } from '../../core/models/station.model';

export type MarkerStatus = 'available' | 'full' | 'closed';

export interface StationFeatureProperties {
  id: number;
  name: string;
  status: MarkerStatus;
  availableBoxes: number;
  totalBoxes: number;
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

export function stationsToFeatureCollection(stations: readonly Station[]): StationFeatureCollection {
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
      },
    })),
  };
}
