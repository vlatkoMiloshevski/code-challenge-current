import { ParamMap, Params } from '@angular/router';

import { MARKER_STATUSES, StationFilters } from '../filters/station-filters';
import { MarkerStatus } from '../map/station-geojson';

// URL parameters that describe the page state, so a link opens the same view:
//   station    id of the open station
//   q          address search text
//   status     comma separated marker statuses (available,full,closed)
//   connectors comma separated connector type names
//   view       "favorites" when only favorite stations are shown

export const FAVORITES_VIEW = 'favorites';

function splitList(raw: string | null): string[] {
  return raw ? raw.split(',').map((part) => part.trim()).filter(Boolean) : [];
}

export function parseStationId(params: ParamMap): number | null {
  const raw = params.get('station');
  const id = raw === null ? NaN : Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Unknown statuses are ignored, so an edited link cannot break the filters. */
export function parseFilters(params: ParamMap): StationFilters {
  const statuses = splitList(params.get('status')).filter((value): value is MarkerStatus =>
    (MARKER_STATUSES as readonly string[]).includes(value),
  );
  return {
    statuses: [...new Set(statuses)],
    connectorTypes: [...new Set(splitList(params.get('connectors')))],
  };
}

export function hasFilterParams(params: ParamMap): boolean {
  return params.has('status') || params.has('connectors');
}

/** Empty filters become null, which removes the parameter from the URL. */
export function filtersToParams(filters: StationFilters): Params {
  return {
    status: filters.statuses.join(',') || null,
    connectors: filters.connectorTypes.join(',') || null,
  };
}

export function isFavoritesView(params: ParamMap): boolean {
  return params.get('view') === FAVORITES_VIEW;
}
