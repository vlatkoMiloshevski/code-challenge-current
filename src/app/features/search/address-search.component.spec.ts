import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { GEOCODING } from '../../core/config/geocoding.config';
import { httpInterceptor } from '../../core/interceptors/http.interceptor';
import { AddressSearchComponent } from './address-search.component';

describe('AddressSearchComponent', () => {
  let fixture: ComponentFixture<AddressSearchComponent>;
  let component: AddressSearchComponent;
  let http: HttpTestingController;

  const expectSearchRequest = () => http.expectOne((req) => req.url === GEOCODING.searchUrl);
  const expectNoSearchRequest = () => http.expectNone((req) => req.url === GEOCODING.searchUrl);
  // The component debounces with RxJS timers, so the tests advance Jest's fake clock instead of zone's fakeAsync.
  const advance = (ms: number) => jest.advanceTimersByTime(ms);

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([httpInterceptor])), provideHttpClientTesting()],
    });
    // The Ionic elements are not needed to test the search logic.
    TestBed.overrideComponent(AddressSearchComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });
    fixture = TestBed.createComponent(AddressSearchComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    jest.useRealTimers();
  });

  it('searches once the user has stopped typing for the configured delay', () => {
    component['onInput']('Karl Johans');

    advance(GEOCODING.searchDelayMs - 1);
    expectNoSearchRequest();

    advance(1);
    expectSearchRequest().flush([]);
  });

  it('restarts the delay on every keystroke', () => {
    component['onInput']('Kar');
    advance(GEOCODING.searchDelayMs - 100);
    component['onInput']('Karl');
    advance(GEOCODING.searchDelayMs - 100);
    expectNoSearchRequest();

    advance(100);
    expectSearchRequest().flush([]);
  });

  it('does not search for queries shorter than the minimum length', () => {
    component['onInput']('ab');

    advance(GEOCODING.searchDelayMs * 2);

    expectNoSearchRequest();
  });

  it('emits the trimmed query as searchChanged when the search runs', () => {
    const changes: string[] = [];
    component.searchChanged.subscribe((text) => changes.push(text));

    component['onInput']('  Oslo  ');
    advance(GEOCODING.searchDelayMs);
    expectSearchRequest().flush([]);

    expect(changes).toEqual(['Oslo']);
  });

  it('searches immediately on Enter and does not search again after the delay', () => {
    component['onInput']('Oslo');

    component['submit']();
    expectSearchRequest().flush([]);

    advance(GEOCODING.searchDelayMs);
    expectNoSearchRequest();
  });

  it('shows a message on Enter when the query is too short', () => {
    component['onInput']('ab');

    component['submit']();

    expect(component['errorMessage']()).toBe(`Type at least ${GEOCODING.minQueryLength} characters to search.`);
    expectNoSearchRequest();
  });

  it('cancels a pending search when the input is cleared', () => {
    component['onInput']('Oslo');

    component['clear']();
    advance(GEOCODING.searchDelayMs);

    expectNoSearchRequest();
  });

  it('shows the error message when the search fails', () => {
    component['onInput']('Oslo');
    advance(GEOCODING.searchDelayMs);

    expectSearchRequest().flush('oops', { status: 500, statusText: 'Server Error' });

    expect(component['errorMessage']()).toBe('The server responded with status 500.');
    expect(component['searching']()).toBe(false);
  });
});
