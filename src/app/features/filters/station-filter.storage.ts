import { MARKER_CONNECTORS, MARKER_STATUSES, NO_FILTERS, StationFilters } from './station-filters';

const STORAGE_KEY = 'station-filters';

export function loadStationFilters(): StationFilters {
  try {
    return parseStationFilters(localStorage.getItem(STORAGE_KEY));
  } catch {
    return NO_FILTERS;
  }
}

export function saveStationFilters(filters: StationFilters): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
  }
}

function parseStationFilters(raw: string | null): StationFilters {
  if (!raw) {
    return NO_FILTERS;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) {
      return NO_FILTERS;
    }
    const { statuses, connectors } = value as Record<string, unknown>;
    return {
      statuses: Array.isArray(statuses)
        ? MARKER_STATUSES.filter((status) => statuses.includes(status))
        : [],
      connectors: Array.isArray(connectors)
        ? MARKER_CONNECTORS.filter((connector) => connectors.includes(connector))
        : [],
    };
  } catch {
    return NO_FILTERS;
  }
}
