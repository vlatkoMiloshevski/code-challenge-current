import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { GEOCODING } from '../config/geocoding.config';

export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

interface NominatimResultDto {
  lat: string;
  lon: string;
  display_name: string;
}

export type GeocodingErrorKind = 'network' | 'server' | 'invalid';

export class GeocodingError extends Error {
  constructor(
    readonly kind: GeocodingErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'GeocodingError';
  }
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);

  search(query: string): Observable<GeocodeResult[]> {
    const params = new HttpParams()
      .set('q', query)
      .set('format', 'jsonv2')
      .set('limit', String(GEOCODING.resultLimit));

    return this.http.get<NominatimResultDto[]>(GEOCODING.searchUrl, { params }).pipe(
      map((rows) => {
        if (!Array.isArray(rows)) {
          throw new GeocodingError('invalid', 'Unexpected response from the address search.');
        }
        return rows.flatMap((row) => {
          const latitude = Number(row.lat);
          const longitude = Number(row.lon);
          return Number.isFinite(latitude) && Number.isFinite(longitude)
            ? [{ label: row.display_name, latitude, longitude }]
            : [];
        });
      }),
      catchError((error: unknown) => throwError(() => toGeocodingError(error))),
    );
  }
}

function toGeocodingError(error: unknown): GeocodingError {
  if (error instanceof GeocodingError) {
    return error;
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return new GeocodingError('network', 'Could not reach the address search. Check your connection.');
    }
    return new GeocodingError('server', `Address search responded with status ${error.status}.`);
  }
  return new GeocodingError('network', 'Unexpected error during the address search.');
}
