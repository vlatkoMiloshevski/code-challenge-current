import { makeStation } from '../../../testing/fixtures';
import { NO_FILTERS, connectorTypeNames, filterStations, hasActiveFilters, toggleValue } from './station-filters';

const ccs2 = { type: { id: 9, name: 'CCS2', iconName: 'ccs2', category: 33 }, amount: 2, available: 1 };
const chademo = { type: { id: 6, name: 'CHAdeMO', iconName: 'chademo', category: 40 }, amount: 1, available: 0 };

describe('filterStations', () => {
  const available = makeStation({ id: 1 });
  const full = makeStation({ id: 2, boxes: { total: 2, available: 0, occupied: 2, offline: 0 } });
  const closed = makeStation({ id: 3, isOpen: false });
  const stations = [available, full, closed];

  it('returns every station when no filter is set', () => {
    expect(filterStations(stations, NO_FILTERS)).toEqual(stations);
  });

  it('keeps only the selected statuses', () => {
    const result = filterStations(stations, { statuses: ['full', 'closed'], connectors: [] });
    expect(result.map((station) => station.id)).toEqual([2, 3]);
  });

  it('keeps stations that have at least one of the selected connector types', () => {
    const withChademo = makeStation({ id: 4, connectors: [chademo] });
    const withCcs2 = makeStation({ id: 5, connectors: [ccs2] });

    const result = filterStations([withChademo, withCcs2], { statuses: [], connectors: ['CHAdeMO'] });

    expect(result.map((station) => station.id)).toEqual([4]);
  });

  it('requires both a matching status and a matching connector', () => {
    const availableChademo = makeStation({ id: 6, connectors: [chademo] });
    const fullCcs2 = makeStation({
      id: 7,
      boxes: { total: 2, available: 0, occupied: 2, offline: 0 },
      connectors: [ccs2],
    });

    const result = filterStations([availableChademo, fullCcs2], { statuses: ['full'], connectors: ['CHAdeMO'] });

    expect(result).toEqual([]);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the empty filter set', () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
  });

  it('is true when any status or connector is selected', () => {
    expect(hasActiveFilters({ statuses: ['available'], connectors: [] })).toBe(true);
    expect(hasActiveFilters({ statuses: [], connectors: ['CCS2'] })).toBe(true);
  });
});

describe('connectorTypeNames', () => {
  it('returns unique connector names sorted alphabetically', () => {
    const stations = [makeStation({ connectors: [ccs2, chademo] }), makeStation({ connectors: [ccs2] })];

    expect(connectorTypeNames(stations)).toEqual(['CCS2', 'CHAdeMO']);
  });
});

describe('toggleValue', () => {
  it('adds a missing value and removes an existing one', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
  });
});
