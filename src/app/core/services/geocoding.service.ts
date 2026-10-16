import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

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

export class GeocodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeocodingError';
  }
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);

  search(query: string): Observable<GeocodeResult[]> {
    const params = new HttpParams().set('q', query).set('format', 'jsonv2').set('limit', String(GEOCODING.resultLimit));

    return this.http.get<NominatimResultDto[]>(GEOCODING.searchUrl, { params }).pipe(
      map((rows) => {
        if (!Array.isArray(rows)) {
          throw new GeocodingError('Unexpected response from the address search.');
        }
        return rows.flatMap((row) => {
          const latitude = Number(row.lat);
          const longitude = Number(row.lon);
          return Number.isFinite(latitude) && Number.isFinite(longitude)
            ? [{ label: row.display_name, latitude, longitude }]
            : [];
        });
      }),
    );
  }
}
