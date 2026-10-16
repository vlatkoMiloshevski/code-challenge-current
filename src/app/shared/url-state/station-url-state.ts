import { ParamMap, Params } from '@angular/router';

import { MARKER_CONNECTORS, MARKER_STATUSES, StationFilters } from '../../features/filters/station-filters';
import { MarkerStatus } from '../../features/map/station-geojson';
import { MarkerConnector } from '../../core/models/station.model';

export const FAVORITES_VIEW = 'favorites';

function splitList(raw: string | null): string[] {
  return raw ? raw.split(',').map((part) => part.trim()).filter(Boolean) : [];
}

export function parseStationId(params: ParamMap): number | null {
  const raw = params.get('station');
  const id = raw === null ? NaN : Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function parseFilters(params: ParamMap): StationFilters {
  const statuses = splitList(params.get('status')).filter((value): value is MarkerStatus =>
    (MARKER_STATUSES as readonly string[]).includes(value),
  );
  const connectors = splitList(params.get('connectors')).filter((value): value is MarkerConnector =>
    (MARKER_CONNECTORS as readonly string[]).includes(value),
  );
  return {
    statuses: [...new Set(statuses)],
    connectors: [...new Set(connectors)],
  };
}

export function hasFilterParams(params: ParamMap): boolean {
  return params.has('status') || params.has('connectors');
}

export function filtersToParams(filters: StationFilters): Params {
  return {
    status: filters.statuses.join(',') || null,
    connectors: filters.connectors.join(',') || null,
  };
}

export function isFavoritesView(params: ParamMap): boolean {
  return params.get('view') === FAVORITES_VIEW;
}
