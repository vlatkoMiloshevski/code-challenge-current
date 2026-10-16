import { convertToParamMap } from '@angular/router';

import { NO_FILTERS } from '../../features/filters/station-filters';
import { filtersToParams, hasFilterParams, isFavoritesView, parseFilters, parseStationId } from './station-url-state';

describe('station URL state', () => {
  describe('parseStationId', () => {
    it('reads a positive integer id', () => {
      expect(parseStationId(convertToParamMap({ station: '42' }))).toBe(42);
    });

    it.each(['0', '-1', 'abc', '1.5', ''])('rejects %p', (value) => {
      expect(parseStationId(convertToParamMap({ station: value }))).toBeNull();
    });

    it('returns null when the parameter is missing', () => {
      expect(parseStationId(convertToParamMap({}))).toBeNull();
    });
  });

  describe('parseFilters', () => {
    it('reads comma-separated statuses and connectors', () => {
      const filters = parseFilters(convertToParamMap({ status: 'available,full', connectors: 'CCS2,CHAdeMO' }));

      expect(filters).toEqual({ statuses: ['available', 'full'], connectors: ['CCS2', 'CHAdeMO'] });
    });

    it('drops unknown values and duplicates', () => {
      const filters = parseFilters(convertToParamMap({ status: 'available,nope,available', connectors: 'Foo' }));

      expect(filters).toEqual({ statuses: ['available'], connectors: [] });
    });
  });

  describe('filtersToParams', () => {
    it('writes the filters as comma-separated values', () => {
      expect(filtersToParams({ statuses: ['full'], connectors: ['CCS2', 'CHAdeMO'] })).toEqual({
        status: 'full',
        connectors: 'CCS2,CHAdeMO',
      });
    });

    it('writes null for empty filters so the parameters are removed from the URL', () => {
      expect(filtersToParams(NO_FILTERS)).toEqual({ status: null, connectors: null });
    });
  });

  it('detects whether filter parameters are present', () => {
    expect(hasFilterParams(convertToParamMap({ status: 'full' }))).toBe(true);
    expect(hasFilterParams(convertToParamMap({ station: '1' }))).toBe(false);
  });

  it('detects the favorites view', () => {
    expect(isFavoritesView(convertToParamMap({ view: 'favorites' }))).toBe(true);
    expect(isFavoritesView(convertToParamMap({ view: 'all' }))).toBe(false);
  });
});
