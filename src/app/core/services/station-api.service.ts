import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { StationApiError } from '../api/station-api.error';
import { StationDetailResponseDto, StationListResponseDto } from '../api/station-api.dto';
import { Station, StationDetail } from '../models/station.model';
import { mapStation, mergeStationDetail } from '../mappers/station.mapper';
import { STATION_API } from '../config/station-api.config';

@Injectable({ providedIn: 'root' })
export class StationApiService {
  private readonly http = inject(HttpClient);
  // Each URL is requested once per service instance. shareReplay drops a failed request,
  // so a later call (such as "Try again") fetches it again instead of replaying the error.
  private readonly cache = new Map<string, Observable<unknown>>();

  getStations(): Observable<Station[]> {
    return this.cached<StationListResponseDto>(STATION_API.stationsUrl).pipe(
      map((response) => {
        if (!Array.isArray(response?.Result)) {
          throw new StationApiError('Station list response has an unexpected shape.');
        }
        return response.Result.map(mapStation);
      }),
    );
  }

  getStationDetail(station: Station): Observable<StationDetail> {
    return this.cached<StationDetailResponseDto>(STATION_API.stationDetailUrl).pipe(
      map((response) => {
        if (!response?.Result) {
          throw new StationApiError('Station detail response has an unexpected shape.');
        }
        return mergeStationDetail(station, response.Result);
      }),
    );
  }

  private cached<T>(url: string): Observable<T> {
    let request = this.cache.get(url);
    if (!request) {
      request = this.http.get<T>(url).pipe(shareReplay(1));
      this.cache.set(url, request);
    }
    return request as Observable<T>;
  }
}
