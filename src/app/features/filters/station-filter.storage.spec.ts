import { loadStationFilters, saveStationFilters } from './station-filter.storage';
import { NO_FILTERS } from './station-filters';

describe('station filter storage', () => {
  beforeEach(() => localStorage.clear());

  it('returns no filters when nothing is stored', () => {
    expect(loadStationFilters()).toEqual(NO_FILTERS);
  });

  it('restores the saved filters', () => {
    saveStationFilters({ statuses: ['available'], connectors: ['CCS2'] });

    expect(loadStationFilters()).toEqual({ statuses: ['available'], connectors: ['CCS2'] });
  });

  it('drops values that are not known filter options', () => {
    localStorage.setItem(
      'station-filters',
      JSON.stringify({ statuses: ['available', 'bogus'], connectors: ['CCS2', 'Unknown'] }),
    );

    expect(loadStationFilters()).toEqual({ statuses: ['available'], connectors: ['CCS2'] });
  });

  it('returns no filters for corrupted JSON', () => {
    localStorage.setItem('station-filters', '{not json');

    expect(loadStationFilters()).toEqual(NO_FILTERS);
  });
});
