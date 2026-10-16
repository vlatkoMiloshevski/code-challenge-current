import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { GEOCODING } from '../config/geocoding.config';
import { httpInterceptor } from '../interceptors/http.interceptor';
import { GeocodeResult, GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([httpInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(GeocodingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the query with the format and result limit', () => {
    service.search('Karl Johans gate').subscribe();

    const request = http.expectOne((req) => req.url === GEOCODING.searchUrl);
    expect(request.request.params.get('q')).toBe('Karl Johans gate');
    expect(request.request.params.get('format')).toBe('jsonv2');
    expect(request.request.params.get('limit')).toBe(String(GEOCODING.resultLimit));
    request.flush([]);
  });

  it('converts the string coordinates to numbers and keeps the label', () => {
    let result: GeocodeResult[] | undefined;
    service.search('Oslo').subscribe((found) => (result = found));

    http
      .expectOne((req) => req.url === GEOCODING.searchUrl)
      .flush([{ lat: '59.9139', lon: '10.7522', display_name: 'Oslo, Norway' }]);

    expect(result).toEqual([{ label: 'Oslo, Norway', latitude: 59.9139, longitude: 10.7522 }]);
  });

  it('drops results whose coordinates are not numbers', () => {
    let result: GeocodeResult[] | undefined;
    service.search('Oslo').subscribe((found) => (result = found));

    http
      .expectOne((req) => req.url === GEOCODING.searchUrl)
      .flush([
        { lat: 'not-a-number', lon: '10.75', display_name: 'Broken' },
        { lat: '59.91', lon: '10.75', display_name: 'Valid' },
      ]);

    expect(result?.map((item) => item.label)).toEqual(['Valid']);
  });

  it('returns an empty list when nothing matches', () => {
    let result: GeocodeResult[] | undefined;
    service.search('zzzz').subscribe((found) => (result = found));

    http.expectOne((req) => req.url === GEOCODING.searchUrl).flush([]);

    expect(result).toEqual([]);
  });

  it('reports a network error when the service cannot be reached', () => {
    let message: string | undefined;
    service.search('Oslo').subscribe({ error: (error: Error) => (message = error.message) });

    http
      .expectOne((req) => req.url === GEOCODING.searchUrl)
      .error(new ProgressEvent('error'), { status: 0, statusText: '' });

    expect(message).toBe('Could not reach the server. Check your connection.');
  });

  it('reports the status code for a server error', () => {
    let message: string | undefined;
    service.search('Oslo').subscribe({ error: (error: Error) => (message = error.message) });

    http
      .expectOne((req) => req.url === GEOCODING.searchUrl)
      .flush('rate limited', { status: 429, statusText: 'Too Many Requests' });

    expect(message).toBe('The server responded with status 429.');
  });

  it('reports an unexpected response when the body is not a list', () => {
    let message: string | undefined;
    service.search('Oslo').subscribe({ error: (error: Error) => (message = error.message) });

    http.expectOne((req) => req.url === GEOCODING.searchUrl).flush({ error: 'nope' });

    expect(message).toBe('Unexpected response from the address search.');
  });
});
