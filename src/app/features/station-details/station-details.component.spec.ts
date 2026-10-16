import { DecimalPipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { STATION_API } from '../../core/config/station-api.config';
import { makeStation, makeStationDetailDto } from '../../../testing/fixtures';
import { StationDetailsComponent } from './station-details.component';

describe('StationDetailsComponent', () => {
  let fixture: ComponentFixture<StationDetailsComponent>;
  let component: StationDetailsComponent;
  let http: HttpTestingController;

  const expectDetailRequest = () => http.expectOne(STATION_API.stationDetailUrl);

  // Settles the input effect that starts the request and the change detection after it.
  function settle(): void {
    TestBed.tick();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    // Ionic elements are replaced by plain elements; the pipe is still needed for the template.
    TestBed.overrideComponent(StationDetailsComponent, {
      set: { imports: [DecimalPipe], schemas: [NO_ERRORS_SCHEMA] },
    });
    fixture = TestBed.createComponent(StationDetailsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('station', makeStation({ id: 42 }));
    settle();
  });

  afterEach(() => http.verify());

  it('starts in the loading state and requests the details for the station', () => {
    expect(component['loading']()).toBe(true);
    expectDetailRequest().flush({ Result: makeStationDetailDto() });
  });

  it('shows the fetched details once the request succeeds', () => {
    expectDetailRequest().flush({ Result: makeStationDetailDto({ OwnedByCompanyName: 'Owner AS' }) });
    settle();

    expect(component['loading']()).toBe(false);
    expect(component['errorMessage']()).toBeNull();
    expect(component['detail']()?.ownerName).toBe('Owner AS');
    expect(component['detail']()?.chargePoints).toHaveLength(1);
  });

  it('keeps an empty list of charge points as a ready state', () => {
    expectDetailRequest().flush({ Result: makeStationDetailDto({ ChargingPoints: [] }) });
    settle();

    expect(component['detail']()?.chargePoints).toEqual([]);
    expect(component['errorMessage']()).toBeNull();
  });

  it('shows the error and retries the request when Try again is used', () => {
    expectDetailRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    settle();

    expect(component['errorMessage']()).toBe('Station service responded with status 500.');
    expect(component['detail']()).toBeNull();

    component['retry']();
    settle();

    expect(component['loading']()).toBe(true);
    expectDetailRequest().flush({ Result: makeStationDetailDto() });
    settle();
    expect(component['detail']()).not.toBeNull();
  });
});
