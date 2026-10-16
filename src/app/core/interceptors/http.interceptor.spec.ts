import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiRequestError } from '../api/api-request.error';
import { HTTP } from '../config/http.config';
import { httpInterceptor } from './http.interceptor';

const URL = 'https://example.test/stations';

describe('httpInterceptor', () => {
  let http: HttpClient;
  let testing: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([httpInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    testing = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    testing.verify();
    jest.useRealTimers();
  });

  // Captures the error the interceptor produced, so tests can assert on its kind and status.
  function requestError(): () => ApiRequestError | undefined {
    let captured: ApiRequestError | undefined;
    http.get(URL).subscribe({
      error: (error: ApiRequestError) => (captured = error),
    });
    return () => captured;
  }

  it('sends the Accept header on every request', () => {
    http.get(URL).subscribe();

    const request = testing.expectOne(URL);
    expect(request.request.headers.get('Accept')).toBe(HTTP.acceptHeader);
    request.flush({});
  });

  it('turns a network failure (status 0) into a network error', () => {
    const error = requestError();
    testing.expectOne(URL).error(new ProgressEvent('error'), { status: 0, statusText: '' });

    expect(error()).toBeInstanceOf(ApiRequestError);
    expect(error()?.type).toBe('network');
    expect(error()?.status).toBeNull();
  });

  it('turns a server error into an http error with the status code', () => {
    const error = requestError();
    testing.expectOne(URL).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(error()?.type).toBe('http');
    expect(error()?.status).toBe(500);
  });

  it('turns a request that takes too long into a timeout error', () => {
    jest.useFakeTimers();
    const error = requestError();

    jest.advanceTimersByTime(HTTP.timeoutMs + 1);

    expect(error()?.type).toBe('timeout');
    // The timeout cancelled the request; it is still listed as open until the test claims it.
    testing.expectOne(URL);
  });
});
