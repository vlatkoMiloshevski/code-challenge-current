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

// Stations within this distance of every other station in their row are drawn side by side.
const ROW_RADIUS_METERS = 60;
const ROW_SPACING_METERS = 15;
const METERS_PER_DEGREE_LAT = 111_320;
// Grid cells of this size are at least ROW_RADIUS_METERS wide in Norway, so checking the neighbouring cells is enough.
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

function cellKey(row: number, column: number): string {
  return `${row}:${column}`;
}

// A station joins a group only when it is close to every member, so a group never spans more than the row radius.
function groupsOfNearbyStations(stations: readonly Station[]): number[][] {
  const cells = new Map<string, number[]>();
  stations.forEach((station, index) => {
    const key = cellKey(
      Math.floor(station.latitude / CELL_DEGREES_LAT),
      Math.floor(station.longitude / CELL_DEGREES_LNG),
    );
    cells.set(key, [...(cells.get(key) ?? []), index]);
  });

  const groups: number[][] = [];
  const groupOf: number[] = [];
  stations.forEach((station, index) => {
    const row = Math.floor(station.latitude / CELL_DEGREES_LAT);
    const column = Math.floor(station.longitude / CELL_DEGREES_LNG);
    const candidates = new Set<number>();
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dColumn = -1; dColumn <= 1; dColumn++) {
        for (const other of cells.get(cellKey(row + dRow, column + dColumn)) ?? []) {
          if (other < index) {
            candidates.add(groupOf[other]);
          }
        }
      }
    }
    const joined = [...candidates].find((group) =>
      groups[group].every((member) => metersBetween(station, stations[member]) <= ROW_RADIUS_METERS),
    );
    if (joined === undefined) {
      groupOf[index] = groups.push([index]) - 1;
    } else {
      groups[joined].push(index);
      groupOf[index] = joined;
    }
  });
  return groups;
}

// Returns one [longitude, latitude] per station. Stations that share a spot are laid out in a row around its centre.
function markerPositions(stations: readonly Station[]): [number, number][] {
  const positions = stations.map((station): [number, number] => [station.longitude, station.latitude]);
  for (const members of groupsOfNearbyStations(stations)) {
    if (members.length < 2) {
      continue;
    }
    const centreLat = members.reduce((sum, index) => sum + stations[index].latitude, 0) / members.length;
    const centreLng = members.reduce((sum, index) => sum + stations[index].longitude, 0) / members.length;
    const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((centreLat * Math.PI) / 180);
    members.forEach((index, slot) => {
      const eastMeters = (slot - (members.length - 1) / 2) * ROW_SPACING_METERS;
      positions[index] = [centreLng + eastMeters / metersPerDegreeLng, centreLat];
    });
  }
  return positions;
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
