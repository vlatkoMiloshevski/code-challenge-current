import { MarkerConnector, Station } from '../../core/models/station.model';
import { MarkerStatus, markerStatus } from '../map/station-geojson';

export const MARKER_STATUSES: readonly MarkerStatus[] = ['available', 'full', 'closed'];
export const MARKER_CONNECTORS: readonly MarkerConnector[] = ['CCS2', 'Type - 2', 'CHAdeMO'];

export interface StationFilters {
  statuses: MarkerStatus[];
  connectors: MarkerConnector[];
}

export const NO_FILTERS: StationFilters = { statuses: [], connectors: [] };

export function hasActiveFilters(filters: StationFilters): boolean {
  return filters.statuses.length > 0 || filters.connectors.length > 0;
}

export function filterStations(stations: readonly Station[], filters: StationFilters): Station[] {
  return stations.filter(
    (station) =>
      (filters.statuses.length === 0 || filters.statuses.includes(markerStatus(station))) &&
      (filters.connectors.length === 0 ||
        station.connectors.some((connector) => filters.connectors.includes(connector.type.name as MarkerConnector))),
  );
}

export function connectorTypeNames(stations: readonly Station[]): string[] {
  const names = new Set<string>();
  for (const station of stations) {
    for (const connector of station.connectors) {
      names.add(connector.type.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
