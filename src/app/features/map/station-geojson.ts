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

// Stations closer than this share a marker position, so their markers are spread around it.
const OVERLAP_METERS = 60;
const SPREAD_RADIUS_METERS = 30;
const METERS_PER_DEGREE_LAT = 111_320;
// Grid cells this size are never smaller than OVERLAP_METERS at Norwegian latitudes, so a neighbour search of one cell is enough.
const CELL_DEGREES_LAT = 0.001;
const CELL_DEGREES_LNG = 0.002;

function metersBetween(a: Station, b: Station): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

// Returns one [longitude, latitude] per station. Stations without a close neighbour keep their real position.
function markerPositions(stations: readonly Station[]): [number, number][] {
  const positions = stations.map((station): [number, number] => [station.longitude, station.latitude]);

  const cells = new Map<string, number[]>();
  stations.forEach((station, index) => {
    const key = cellKey(
      Math.floor(station.latitude / CELL_DEGREES_LAT),
      Math.floor(station.longitude / CELL_DEGREES_LNG),
    );
    cells.set(key, [...(cells.get(key) ?? []), index]);
  });

  const parent = stations.map((_, index) => index);
  const find = (index: number): number => (parent[index] === index ? index : (parent[index] = find(parent[index])));
  stations.forEach((station, index) => {
    const row = Math.floor(station.latitude / CELL_DEGREES_LAT);
    const column = Math.floor(station.longitude / CELL_DEGREES_LNG);
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dColumn = -1; dColumn <= 1; dColumn++) {
        for (const other of cells.get(cellKey(row + dRow, column + dColumn)) ?? []) {
          if (other > index && metersBetween(station, stations[other]) <= OVERLAP_METERS) {
            parent[find(other)] = find(index);
          }
        }
      }
    }
  });

  const groups = new Map<number, number[]>();
  stations.forEach((_, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), index]);
  });

  for (const members of groups.values()) {
    if (members.length < 2) {
      continue;
    }
    const centreLat = members.reduce((sum, index) => sum + stations[index].latitude, 0) / members.length;
    const centreLng = members.reduce((sum, index) => sum + stations[index].longitude, 0) / members.length;
    const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((centreLat * Math.PI) / 180);
    members.forEach((index, slot) => {
      const angle = (2 * Math.PI * slot) / members.length;
      positions[index] = [
        centreLng + (SPREAD_RADIUS_METERS * Math.cos(angle)) / metersPerDegreeLng,
        centreLat + (SPREAD_RADIUS_METERS * Math.sin(angle)) / METERS_PER_DEGREE_LAT,
      ];
    });
  }
  return positions;
}

function cellKey(row: number, column: number): string {
  return `${row}:${column}`;
}

export function stationsToFeatureCollection(stations: readonly Station[]): StationFeatureCollection {
  const positions = markerPositions(stations);
  return {
    type: 'FeatureCollection',
    features: stations.map((station, index) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: positions[index] },
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
