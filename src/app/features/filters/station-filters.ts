import { Station } from '../../core/models/station.model';
import { MarkerStatus, markerStatus } from '../map/station-geojson';

export const MARKER_STATUSES: readonly MarkerStatus[] = ['available', 'full', 'closed'];

export interface StationFilters {
  /** Empty means no status restriction. */
  statuses: MarkerStatus[];
  /** Connector type names such as "CCS2". Empty means no restriction. */
  connectorTypes: string[];
}

export const NO_FILTERS: StationFilters = { statuses: [], connectorTypes: [] };

export function hasActiveFilters(filters: StationFilters): boolean {
  return filters.statuses.length > 0 || filters.connectorTypes.length > 0;
}

/**
 * Within one group a station matches if it matches any selected value (OR).
 * Between the status group and the connector group both must match (AND).
 */
export function filterStations(stations: readonly Station[], filters: StationFilters): Station[] {
  return stations.filter(
    (station) =>
      (filters.statuses.length === 0 || filters.statuses.includes(markerStatus(station))) &&
      (filters.connectorTypes.length === 0 ||
        station.connectors.some((connector) => filters.connectorTypes.includes(connector.type.name))),
  );
}

/** Distinct connector type names across all stations, sorted for stable chip order. */
export function connectorTypeNames(stations: readonly Station[]): string[] {
  const names = new Set<string>();
  for (const station of stations) {
    for (const connector of station.connectors) {
      names.add(connector.type.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Adds the value if it is missing, removes it if it is present. Returns a new array. */
export function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
