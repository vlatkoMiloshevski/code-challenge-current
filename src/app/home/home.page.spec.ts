import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, NEVER, Observable, of, throwError } from 'rxjs';

import { Station } from '../core/models/station.model';
import { GeocodeResult, GeocodingService } from '../core/services/geocoding.service';
import { StationApiService } from '../core/services/station-api.service';
import { HomePage } from './home.page';
import { makeStation } from '../../testing/fixtures';

// The map uses maplibre-gl, which Jest cannot load (WebGL and ESM). Map behavior is out of scope here.
jest.mock('../features/map/station-map.component', () => ({ StationMapComponent: class {} }));

const FULL_BOXES = { total: 2, available: 0, occupied: 2, offline: 0 };

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;
  let page: HomePage;
  let navigate: jest.SpyInstance;
  let stationApi: { getStations: jest.Mock<Observable<Station[]>> };
  let params$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const stations = [
    makeStation({ id: 1, name: 'Available one' }),
    makeStation({ id: 2, name: 'Full one', boxes: FULL_BOXES }),
    makeStation({ id: 3, name: 'Closed one', isOpen: false }),
  ];

  // Creates the page with the given URL query parameters and station list.
  function createPage(query: Record<string, string> = {}, list: Station[] = stations): void {
    params$ = new BehaviorSubject(convertToParamMap(query));
    stationApi = { getStations: jest.fn(() => of(list)) };

    TestBed.configureTestingModule({
      providers: [
        { provide: StationApiService, useValue: stationApi },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: params$.value }, queryParamMap: params$.asObservable() },
        },
      ],
    });
    // Child components are tested on their own; here only the page logic and its template matter.
    TestBed.overrideComponent(HomePage, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });

    navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(HomePage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  }

  function setDesktop(matches: boolean): void {
    window.matchMedia = (query: string) =>
      ({
        matches,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList;
  }

  function text(selector: string): string {
    return fixture.nativeElement.querySelector(selector)?.textContent?.trim() ?? '';
  }

  function buttonWithText(label: string): HTMLElement | undefined {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('ion-button')).find(
      (button) => button.textContent?.trim() === label,
    );
  }

  beforeEach(() => {
    localStorage.clear();
  });

  describe('loading the stations', () => {
    it('shows a loading spinner while the stations are requested', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: StationApiService, useValue: { getStations: () => NEVER } },
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { queryParamMap: convertToParamMap({}) }, queryParamMap: of(convertToParamMap({})) },
          },
        ],
      });
      TestBed.overrideComponent(HomePage, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });
      fixture = TestBed.createComponent(HomePage);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('ion-spinner')?.getAttribute('aria-label')).toBe('Loading stations');
    });

    it('shows the error and reloads the stations when Try again is clicked', () => {
      createPage();
      stationApi.getStations.mockReturnValueOnce(throwError(() => new Error('Could not reach the station service.')));

      page['load']();
      fixture.detectChanges();

      expect(text('.state-center')).toContain('Could not reach the station service.');

      buttonWithText('Try again')?.click();

      expect(stationApi.getStations).toHaveBeenCalledTimes(3);
    });

    it('shows the empty state when the list has no stations', () => {
      createPage({}, []);

      expect(text('.state-center')).toBe('No charging stations found.');
    });
  });

  describe('filtering', () => {
    it('applies the status filter from the URL', () => {
      createPage({ status: 'full' });

      expect(page['visibleStations']().map((station) => station.id)).toEqual([2]);
    });

    it('applies the connector filter from the URL', () => {
      createPage({ connectors: 'CHAdeMO' });

      expect(page['visibleStations']()).toEqual([]);
      expect(text('.no-match')).toContain('No stations match the selected filters.');
    });

    it('writes the new filters to the URL and saves them to local storage', () => {
      createPage();

      page['onFiltersChange']({ statuses: ['available'], connectors: [] });

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { status: 'available', connectors: null, station: null },
          replaceUrl: true,
        }),
      );
      expect(JSON.parse(localStorage.getItem('station-filters') ?? '{}')).toEqual({
        statuses: ['available'],
        connectors: [],
      });
    });

    it('offers Clear filters when the filters hide every station, and clears them', () => {
      createPage({ status: 'closed', connectors: 'CHAdeMO' });
      fixture.detectChanges();

      const clear = buttonWithText('Clear filters');
      expect(clear).toBeDefined();

      clear?.click();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { status: null, connectors: null, station: null } }),
      );
    });

    it('restores the stored filters when the URL has no filter parameters', () => {
      localStorage.setItem('station-filters', JSON.stringify({ statuses: ['full'], connectors: [] }));

      createPage();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { status: 'full', connectors: null }, replaceUrl: true }),
      );
    });

    it('keeps the URL filters and ignores the stored ones when the URL has filter parameters', () => {
      localStorage.setItem('station-filters', JSON.stringify({ statuses: ['full'], connectors: [] }));

      createPage({ status: 'available' });

      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('favorites', () => {
    it('shows only favorite stations in the favorites view', () => {
      localStorage.setItem('favorites', JSON.stringify({ stations: [2], chargePoints: [] }));

      createPage({ view: 'favorites' });

      expect(page['visibleStations']().map((station) => station.id)).toEqual([2]);
    });

    it('includes a station that has a favorite charge point', () => {
      localStorage.setItem(
        'favorites',
        JSON.stringify({ stations: [], chargePoints: [{ stationId: 3, chargePointId: 30 }] }),
      );

      createPage({ view: 'favorites' });

      expect(page['visibleStations']().map((station) => station.id)).toEqual([3]);
    });

    it('explains that there are no favorites yet when the favorites view is empty', () => {
      createPage({ view: 'favorites' });

      expect(text('.no-match')).toContain('No favorites yet.');
    });

    it('switches the favorites view on and off through the URL', () => {
      createPage();

      page['toggleFavoritesView']();
      expect(navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ queryParams: { view: 'favorites' }, replaceUrl: true }),
      );

      params$.next(convertToParamMap({ view: 'favorites' }));
      fixture.detectChanges();
      page['toggleFavoritesView']();
      expect(navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ queryParams: { view: null }, replaceUrl: true }),
      );
    });
  });

  describe('station details', () => {
    it('opens the selected station through the URL', () => {
      createPage();

      page['onStationSelected'](stations[0]);

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { station: '1' }, replaceUrl: false }),
      );
    });

    it('resolves the selected station from the URL once the list is loaded', () => {
      createPage({ station: '2' });

      expect(page['selectedStation']()?.name).toBe('Full one');
    });

    it('closes the details by removing the station from the URL', () => {
      createPage({ station: '1' });

      page['closeDetails']();

      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { station: null }, replaceUrl: true }),
      );
    });

    it('shows the side panel on desktop when a station is selected', () => {
      setDesktop(true);
      createPage({ station: '1' });

      expect(fixture.nativeElement.querySelector('aside.side-panel')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('ion-modal')).toBeNull();
    });

    it('uses the bottom sheet on mobile', () => {
      setDesktop(false);
      createPage({ station: '1' });

      expect(fixture.nativeElement.querySelector('aside.side-panel')).toBeNull();
      expect(fixture.nativeElement.querySelector('ion-modal')).not.toBeNull();
    });
  });

  describe('address in the URL', () => {
    function createPageWithGeocoder(query: Record<string, string>, results: GeocodeResult[]) {
      const geocoding = { search: jest.fn(() => of(results)) };
      TestBed.configureTestingModule({ providers: [{ provide: GeocodingService, useValue: geocoding }] });
      createPage(query);
      return geocoding;
    }

    it('places the marker on the address from the URL', () => {
      const address = { label: 'Karl Johans gate, Oslo, Norway', latitude: 59.91, longitude: 10.73 };
      const geocoding = createPageWithGeocoder({ q: address.label }, [address]);

      expect(geocoding.search).toHaveBeenCalledWith(address.label);
      expect(page['focusPoint']()).toEqual(address);
    });

    it('prefers the result whose label matches the URL', () => {
      const other = { label: 'Karl Johans gate, Bergen, Norway', latitude: 60.39, longitude: 5.32 };
      const match = { label: 'Karl Johans gate, Oslo, Norway', latitude: 59.91, longitude: 10.73 };
      createPageWithGeocoder({ q: match.label }, [other, match]);

      expect(page['focusPoint']()).toEqual(match);
    });

    it('does not look up a query shorter than the minimum length', () => {
      const geocoding = createPageWithGeocoder({ q: 'ab' }, []);

      expect(geocoding.search).not.toHaveBeenCalled();
      expect(page['focusPoint']()).toBeNull();
    });
  });

  describe('address search and location', () => {
    it('writes the search text to the URL', () => {
      createPage();

      page['onSearchChanged']('Karl Johans gate');

      expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { q: 'Karl Johans gate' } }));
    });

    it('removes the focus point when the search text is cleared', () => {
      createPage();
      page['onAddressSelected']({ label: 'Oslo', latitude: 59.9, longitude: 10.7 });

      page['onSearchChanged']('');

      expect(page['focusPoint']()).toBeNull();
    });

    it('shows the location message and clears it when the location is found', () => {
      createPage();

      page['onLocationError']('Location access is blocked.');
      fixture.detectChanges();
      expect(text('.notice')).toBe('Location access is blocked.');

      page['onLocationFound']();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.notice')).toBeNull();
    });
  });
});
