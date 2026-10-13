import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { StationDetailResponseDto, StationListResponseDto } from '../api/station-api.dto';
import { Station, StationDetail } from '../models/station.model';
import { mapStation, mergeStationDetail } from '../mappers/station.mapper';
import { STATION_API } from '../config/station-api.config';

export type StationApiErrorKind = 'network' | 'server' | 'invalid' | 'unknown';

export class StationApiError extends Error {
  constructor(
    readonly kind: StationApiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'StationApiError';
  }
}

@Injectable({ providedIn: 'root' })
export class StationApiService {
  private readonly http = inject(HttpClient);

  /** Loads all stations. An empty array is a valid result and is not an error. */
  getStations(): Observable<Station[]> {
    return this.http.get<StationListResponseDto>(STATION_API.stationsUrl).pipe(
      map((response) => {
        if (!Array.isArray(response?.Result)) {
          throw new StationApiError('invalid', 'Station list response has an unexpected shape.');
        }
        return response.Result.map(mapStation);
      }),
      catchError((error: unknown) => throwError(() => toStationApiError(error))),
    );
  }

  /**
   * Loads details for a station. The API does not filter by id, so the result is merged
   * with the station that was clicked on the map.
   */
  getStationDetail(station: Station): Observable<StationDetail> {
    return this.http.get<StationDetailResponseDto>(STATION_API.stationDetailUrl).pipe(
      map((response) => {
        if (!response?.Result) {
          throw new StationApiError('invalid', 'Station detail response has an unexpected shape.');
        }
        return mergeStationDetail(station, response.Result);
      }),
      catchError((error: unknown) => throwError(() => toStationApiError(error))),
    );
  }
}

function toStationApiError(error: unknown): StationApiError {
  if (error instanceof StationApiError) {
    return error;
  }
  if (error instanceof HttpErrorResponse) {
    // status 0 means the request never got a response (offline, CORS, DNS, etc.)
    if (error.status === 0) {
      return new StationApiError('network', 'Could not reach the station service. Check your connection.');
    }
    return new StationApiError('server', `Station service responded with status ${error.status}.`);
  }
  return new StationApiError('unknown', 'Unexpected error while loading stations.');
}
