import { ConnectorType, Station, StationConnector } from '../models/station.model';

const CONNECTOR_TYPES: readonly ConnectorType[] = [
  { id: 4, name: 'Type - 2', iconName: 'type-2', category: 25 },
  { id: 6, name: 'CHAdeMO', iconName: 'chademo', category: 40 },
  { id: 9, name: 'CCS2', iconName: 'ccs2', category: 33 },
];

const STATION_TYPES: readonly string[] = ['AppartmentBuilding', 'PrivateParking', 'HomeCharger', 'Public'];

const BOUNDS = { minLat: 59.85, maxLat: 59.98, minLng: 10.6, maxLng: 10.95 };

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function syntheticStationsFor(param: string | null): Station[] | null {
  const count = Number(param);
  return Number.isInteger(count) && count > 0 && count <= 50_000 ? generateSyntheticStations(count) : null;
}

export function generateSyntheticStations(count: number, seed = 42): Station[] {
  const random = createRandom(seed);
  const between = (min: number, max: number) => min + random() * (max - min);
  const pick = <T>(values: readonly T[]): T => values[Math.floor(random() * values.length)];

  return Array.from({ length: count }, (_, index) => {
    const connectorCount = 1 + Math.floor(random() * 3);
    const connectors: StationConnector[] = Array.from({ length: connectorCount }, () => {
      const amount = 1 + Math.floor(random() * 8);
      return {
        type: pick(CONNECTOR_TYPES),
        amount,
        available: Math.floor(random() * (amount + 1)),
      };
    });
    const total = connectors.reduce((sum, connector) => sum + connector.amount, 0);
    const available = connectors.reduce((sum, connector) => sum + connector.available, 0);

    return {
      id: 1_000_000 + index,
      name: `Synthetic station ${index + 1}`,
      address: `Test street ${index + 1}`,
      postCode: '0000',
      town: 'Oslo',
      country: 'Norway',
      latitude: between(BOUNDS.minLat, BOUNDS.maxLat),
      longitude: between(BOUNDS.minLng, BOUNDS.maxLng),
      operatorName: 'Synthetic',
      operatorLogoUrl: '',
      type: pick(STATION_TYPES),
      isOpen: random() > 0.1,
      isActive: true,
      isFavorite: false,
      distance: 0,
      power: { minKwh: 7.4, maxKwh: 22.2 },
      boxes: { total, available, occupied: total - available, offline: 0 },
      connectors,
    };
  });
}
