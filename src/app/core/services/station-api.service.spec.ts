import { Observable } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { STATION_API } from '../config/station-api.config';
import { Station, StationDetail } from '../models/station.model';
import { StationApiService } from './station-api.service';
import { makeStation, makeStationDetailDto, makeStationDto } from '../../../testing/fixtures';

describe('StationApiService', () => {
  let service: StationApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StationApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getStationDetail', () => {
    it('keeps the list data and adds pricing, support and charge points', () => {
      const station = makeStation({ id: 42, name: 'From list' });
      let result: StationDetail | undefined;
      service.getStationDetail(station).subscribe((detail) => (result = detail));

      http.expectOne(STATION_API.stationDetailUrl).flush({ Result: makeStationDetailDto() });

      expect(result?.id).toBe(42);
      expect(result?.name).toBe('From list');
      expect(result?.ownerName).toBe('Owner AS');
      expect(result?.pricing?.costPerKwh).toBe(3.5);
      expect(result?.pricing?.currency).toBe('NOK');
      expect(result?.support?.email).toBe('support@example.com');
      expect(result?.chargePoints).toHaveLength(1);
      expect(result?.chargePoints[0].status).toBe('Available');
    });

    it('reports a network error when the service cannot be reached', () => {
      const error = captureError(service.getStationDetail(makeStation()));
      http.expectOne(STATION_API.stationDetailUrl).error(new ProgressEvent('error'), { status: 0, statusText: '' });
      expect(error()?.message).toBe('Could not reach the station service. Check your connection.');
    });

    it('reports the status code for a server error', () => {
      const error = captureError(service.getStationDetail(makeStation()));
      http.expectOne(STATION_API.stationDetailUrl).flush('boom', { status: 500, statusText: 'Server Error' });
      expect(error()?.message).toBe('Station service responded with status 500.');
    });

    it('reports an unexpected shape when the Result is missing', () => {
      const error = captureError(service.getStationDetail(makeStation()));
      http.expectOne(STATION_API.stationDetailUrl).flush({});
      expect(error()?.message).toBe('Station detail response has an unexpected shape.');
    });
  });

  describe('getStations', () => {
    it('maps every station in the list response', () => {
      let result: Station[] | undefined;
      service.getStations().subscribe((stations) => (result = stations));

      http
        .expectOne(STATION_API.stationsUrl)
        .flush({ Result: [makeStationDto({ PK_ChargingStationID: 1 }), makeStationDto({ PK_ChargingStationID: 2 })] });

      expect(result?.map((station) => station.id)).toEqual([1, 2]);
      expect(result?.[0].connectors[0].type.name).toBe('CCS2');
    });

    it('reports an unexpected shape when Result is not an array', () => {
      const error = captureError(service.getStations());
      http.expectOne(STATION_API.stationsUrl).flush({ Result: null });
      expect(error()?.message).toBe('Station list response has an unexpected shape.');
    });
  });
});

// Keeps the error from the observable so tests can assert on it after the flush.
function captureError(source: Observable<unknown>): () => Error | undefined {
  let captured: Error | undefined;
  source.subscribe({ error: (error: Error) => (captured = error) });
  return () => captured;
}
