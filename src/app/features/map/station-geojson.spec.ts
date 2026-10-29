import { makeStation } from '../../../testing/fixtures';
import { StationFeature, stationsToFeatureCollection } from './station-geojson';

function positionOf(feature: StationFeature): { longitude: number; latitude: number } {
  const [longitude, latitude] = feature.geometry.coordinates;
  return { longitude, latitude };
}

// Approximate distance in meters between two features, good enough for values below a few hundred meters.
function metersApart(a: StationFeature, b: StationFeature): number {
  const first = positionOf(a);
  const second = positionOf(b);
  const dLat = (second.latitude - first.latitude) * 111_320;
  const dLng = (second.longitude - first.longitude) * 111_320 * Math.cos((first.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

describe('stationsToFeatureCollection', () => {
  it('keeps the real position of a station that is not close to another one', () => {
    const station = makeStation({ id: 1, latitude: 59.91, longitude: 10.75 });

    const [feature] = stationsToFeatureCollection([station]).features;

    expect(positionOf(feature)).toEqual({ longitude: 10.75, latitude: 59.91 });
  });

  it('spreads stations with identical coordinates apart and keeps their ids', () => {
    const first = makeStation({ id: 1, latitude: 59.91, longitude: 10.75 });
    const second = makeStation({ id: 2, latitude: 59.91, longitude: 10.75 });

    const [a, b] = stationsToFeatureCollection([first, second]).features;

    expect(a.properties.id).toBe(1);
    expect(b.properties.id).toBe(2);
    expect(metersApart(a, b)).toBeGreaterThan(40);
    expect(metersApart(a, b)).toBeLessThan(80);
  });

  it('spreads stations that are close but not identical', () => {
    const first = makeStation({ id: 1, latitude: 59.91, longitude: 10.75 });
    const second = makeStation({ id: 2, latitude: 59.9101, longitude: 10.7501 });

    const [a, b] = stationsToFeatureCollection([first, second]).features;

    expect(metersApart(a, b)).toBeGreaterThan(40);
  });

  it('does not move stations that are far apart', () => {
    const near = makeStation({ id: 1, latitude: 59.91, longitude: 10.75 });
    const far = makeStation({ id: 2, latitude: 59.95, longitude: 10.8 });

    const [a, b] = stationsToFeatureCollection([near, far]).features;

    expect(positionOf(a)).toEqual({ longitude: 10.75, latitude: 59.91 });
    expect(positionOf(b)).toEqual({ longitude: 10.8, latitude: 59.95 });
  });
});
