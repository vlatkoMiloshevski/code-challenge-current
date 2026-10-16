import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TitleCasePipe } from '@angular/common';

import { StationFilterBarComponent } from './station-filter-bar.component';
import { NO_FILTERS, StationFilters } from './station-filters';

describe('StationFilterBarComponent', () => {
  let fixture: ComponentFixture<StationFilterBarComponent>;
  let component: StationFilterBarComponent;

  // Ionic events reach Angular as DOM events, so the tests dispatch them on the stub elements.
  function fire(element: Element, checked: boolean): void {
    element.dispatchEvent(new CustomEvent('ionChange', { detail: { checked } }));
    fixture.detectChanges();
  }

  function checkbox(label: string): HTMLElement {
    const match = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('ion-checkbox')).find(
      (element) => element.textContent?.trim() === label,
    );
    if (!match) {
      throw new Error(`No checkbox labelled "${label}"`);
    }
    return match;
  }

  function sectionToggle(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.section-toggle');
  }

  function clearButton(): HTMLElement | undefined {
    return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('ion-button')).find(
      (button) => button.textContent?.trim() === 'Clear filters',
    );
  }

  function create(filters: StationFilters = NO_FILTERS, favoritesView = false): void {
    TestBed.configureTestingModule({});
    TestBed.overrideComponent(StationFilterBarComponent, {
      set: { imports: [TitleCasePipe], schemas: [NO_ERRORS_SCHEMA] },
    });
    fixture = TestBed.createComponent(StationFilterBarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('filters', filters);
    fixture.componentRef.setInput('favoritesView', favoritesView);
    fixture.detectChanges();
  }

  describe('rendering', () => {
    beforeEach(() => create());

    it('lists every status with a title-cased label', () => {
      const labels = ['Available', 'Full', 'Closed'];
      labels.forEach((label) => expect(checkbox(label)).toBeDefined());
    });

    it('lists every connector type', () => {
      ['CCS2', 'Type - 2', 'CHAdeMO'].forEach((label) => expect(checkbox(label)).toBeDefined());
    });

    it('shows the filters as collapsed by default', () => {
      expect(sectionToggle().getAttribute('aria-expanded')).toBe('false');
      expect(fixture.nativeElement.querySelector('#station-filter-groups').hidden).toBe(true);
    });

    it('does not show the applied label or Clear filters when no filter is set', () => {
      expect(fixture.nativeElement.querySelector('[aria-label="active filters"]')).toBeNull();
      expect(clearButton()).toBeUndefined();
    });
  });

  describe('expanding the filters', () => {
    beforeEach(() => create());

    it('shows the filter groups and turns the arrow when the header is clicked', () => {
      sectionToggle().click();
      fixture.detectChanges();

      expect(sectionToggle().getAttribute('aria-expanded')).toBe('true');
      expect(fixture.nativeElement.querySelector('#station-filter-groups').hidden).toBe(false);
      expect(component['chevronIcon']()).toBe('/assets/icons/chevron-up.svg');
    });

    it('collapses the filter groups again on the second click', () => {
      sectionToggle().click();
      sectionToggle().click();
      fixture.detectChanges();

      expect(component['expanded']()).toBe(false);
      expect(component['chevronIcon']()).toBe('/assets/icons/chevron-down.svg');
    });
  });

  describe('active filters', () => {
    it('shows the applied label when a filter is set', () => {
      create({ statuses: ['full'], connectors: [] });

      expect(fixture.nativeElement.querySelector('[aria-label="active filters"]')).not.toBeNull();
    });

    it('reflects the selected statuses and connectors in the checkboxes', () => {
      create({ statuses: ['available'], connectors: ['CHAdeMO'] });

      expect((checkbox('Available') as HTMLElement & { checked: boolean }).checked).toBe(true);
      expect((checkbox('Full') as HTMLElement & { checked: boolean }).checked).toBe(false);
      expect((checkbox('CHAdeMO') as HTMLElement & { checked: boolean }).checked).toBe(true);
    });
  });

  describe('status and connector changes', () => {
    it('adds a status to the existing filters when it is checked', () => {
      create({ statuses: ['available'], connectors: ['CCS2'] });
      const emitted = jest.fn();
      component.filtersChange.subscribe(emitted);

      fire(checkbox('Full'), true);

      expect(emitted).toHaveBeenCalledWith({ statuses: ['available', 'full'], connectors: ['CCS2'] });
    });

    it('removes a status when it is unchecked and keeps the connectors', () => {
      create({ statuses: ['available', 'full'], connectors: ['CCS2'] });
      const emitted = jest.fn();
      component.filtersChange.subscribe(emitted);

      fire(checkbox('Available'), false);

      expect(emitted).toHaveBeenCalledWith({ statuses: ['full'], connectors: ['CCS2'] });
    });

    it('adds and removes connector types', () => {
      create({ statuses: [], connectors: ['CCS2'] });
      const emitted = jest.fn();
      component.filtersChange.subscribe(emitted);

      fire(checkbox('CHAdeMO'), true);
      expect(emitted).toHaveBeenLastCalledWith({ statuses: [], connectors: ['CCS2', 'CHAdeMO'] });

      fire(checkbox('CCS2'), false);
      expect(emitted).toHaveBeenLastCalledWith({ statuses: [], connectors: [] });
    });

    it('does not emit when the checkbox already matches the filter', () => {
      create({ statuses: ['full'], connectors: [] });
      const emitted = jest.fn();
      component.filtersChange.subscribe(emitted);

      fire(checkbox('Full'), true);
      fire(checkbox('Closed'), false);

      expect(emitted).not.toHaveBeenCalled();
    });
  });

  describe('clearing the filters', () => {
    it('emits empty filters when Clear filters is clicked', () => {
      create({ statuses: ['full'], connectors: ['CCS2'] });
      const emitted = jest.fn();
      component.filtersChange.subscribe(emitted);

      clearButton()?.click();

      expect(emitted).toHaveBeenCalledWith({ statuses: [], connectors: [] });
    });
  });

  describe('favorites switch', () => {
    it('asks to show favorites when the switch is turned on', () => {
      create({ statuses: [], connectors: [] }, false);
      const toggled = jest.fn();
      component.favoritesToggled.subscribe(toggled);

      fire(fixture.nativeElement.querySelector('ion-toggle'), true);

      expect(toggled).toHaveBeenCalledTimes(1);
    });

    it('asks to show all stations when the switch is turned off', () => {
      create({ statuses: [], connectors: [] }, true);
      const toggled = jest.fn();
      component.favoritesToggled.subscribe(toggled);

      fire(fixture.nativeElement.querySelector('ion-toggle'), false);

      expect(toggled).toHaveBeenCalledTimes(1);
    });

    it('does not emit when the switch already matches the favorites view', () => {
      create({ statuses: [], connectors: [] }, true);
      const toggled = jest.fn();
      component.favoritesToggled.subscribe(toggled);

      fire(fixture.nativeElement.querySelector('ion-toggle'), true);

      expect(toggled).not.toHaveBeenCalled();
    });
  });
});
