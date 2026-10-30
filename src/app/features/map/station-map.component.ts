import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import type { Feature, Point } from 'geojson';
import * as maplibregl from 'maplibre-gl';

import { Station } from '../../core/models/station.model';
import {
  markerStatus,
  stackKey,
  StationFeatureCollection,
  stationsBounds,
  stationsToFeatureCollection,
} from './station-geojson';

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const MAP_WORKER_URL = '/assets/maplibre/maplibre-gl-worker.mjs';
const MAP_STYLESHEET_URL = '/assets/maplibre/maplibre-gl.css';

// The map stylesheet is about 80 KB. It is loaded with the map, not in the global styles, so the page does not wait for it.
// A failed load resolves too: the map still works, only the controls are unstyled.
function loadMapStylesheet(): Promise<void> {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = MAP_STYLESHEET_URL;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}
const STATIONS_SOURCE = 'stations';
const CLUSTER_LAYER = 'clusters';
const CLUSTER_COUNT_LAYER = 'cluster-count';
const POINT_LAYER = 'station-points';
const POINT_NAME_LAYER = 'station-names';
const STACK_BADGE_LAYER = 'station-stack-badge';
const STACK_COUNT_LAYER = 'station-stack-count';
const SPIDER_SOURCE = 'spider';
const SPIDER_LEG_LAYER = 'spider-legs';
const SPIDER_POINT_LAYER = 'spider-points';
const SPIDER_NAME_LAYER = 'spider-names';
// Distance from the stack centre to the spread stations, in screen pixels.
const SPIDER_RADIUS_PX = 40;
type MapFilter = NonNullable<Parameters<maplibregl.Map['setFilter']>[1]>;
const INITIAL_CENTER: [number, number] = [10.75, 59.92];
const FOCUS_ZOOM = 15;
const VIEW_TRANSITION_MS = 800;

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export function describeLocationError(error: { code: number } | undefined): string {
  switch (error?.code) {
    case 1:
      return 'Location access is blocked. Allow it in your browser settings to show your position.';
    case 2:
      return 'Your position could not be determined.';
    case 3:
      return 'Finding your position took too long. Try again.';
    default:
      return 'Could not get your location.';
  }
}

@Component({
  selector: 'app-station-map',
  templateUrl: 'station-map.component.html',
  styleUrl: 'station-map.component.scss',
})
export class StationMapComponent implements OnDestroy {
  readonly stations = input.required<readonly Station[]>();
  readonly focusPoint = input<MapPoint | null>(null);
  readonly viewKey = input('');
  readonly stationSelected = output<Station>();
  readonly locationFound = output<void>();
  readonly locationError = output<string>();

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private map: maplibregl.Map | null = null;
  private mapLoaded = false;
  private destroyed = false;
  private searchMarker: maplibregl.Marker | null = null;
  private hasFitted = false;
  private lastViewKey: string | null = null;
  private viewBeforeFocus: { center: maplibregl.LngLat; zoom: number } | null = null;
  private collection: StationFeatureCollection = { type: 'FeatureCollection', features: [] };
  // The stack whose stations are spread out around it, or null when none is.
  private spiderKey: string | null = null;

  constructor() {
    afterNextRender(async () => {
      await loadMapStylesheet();
      if (!this.destroyed) {
        this.initMap();
      }
    });

    effect(() => {
      const stations = this.stations();
      this.collection = stationsToFeatureCollection(stations);
      this.collapseSpider();
      this.pushData();
    });

    effect(() => {
      this.showFocusPoint(this.focusPoint());
    });

    effect(() => {
      const key = this.viewKey();
      untracked(() => {
        const isFirstRun = this.lastViewKey === null;
        if (key === this.lastViewKey) {
          return;
        }
        this.lastViewKey = key;
        if (!isFirstRun && this.map && this.mapLoaded) {
          this.fitToStations(this.map, VIEW_TRANSITION_MS);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.searchMarker?.remove();
    this.searchMarker = null;
    this.map?.remove();
    this.map = null;
  }

  private initMap(): void {
    maplibregl.setWorkerUrl(MAP_WORKER_URL);
    const map = new maplibregl.Map({
      container: this.container().nativeElement,
      style: MAP_STYLE_URL,
      center: INITIAL_CENTER,
      zoom: 11,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserLocation: true,
    });
    geolocate.on('geolocate', () => this.locationFound.emit());
    geolocate.on('error', (event) => this.locationError.emit(describeLocationError(event)));
    map.addControl(geolocate, 'bottom-left');
    this.map = map;

    map.on('load', () => {
      this.addStationLayers(map);
      this.mapLoaded = true;
      this.pushData();
      // A focus point that arrived before the map loaded is shown now, after the initial fit to the stations.
      this.showFocusPoint(this.focusPoint());
    });

    map.on('click', (event: maplibregl.MapMouseEvent) => this.handleClick(event));
    map.on('zoomstart', () => this.collapseSpider());
    for (const layer of [CLUSTER_LAYER, POINT_LAYER, SPIDER_POINT_LAYER]) {
      map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
    }
  }

  private addStationLayers(map: maplibregl.Map): void {
    map.addSource(STATIONS_SOURCE, {
      type: 'geojson',
      data: this.collection,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    map.addLayer({
      id: CLUSTER_LAYER,
      type: 'circle',
      source: STATIONS_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#3880ff',
          10,
          '#d79118',
          40,
          '#8fca0f',
          200,
          '#2dd36f',
          1000,
          '#bb5fb5',
        ],
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 18, 40, 20, 200, 22, 1000, 24],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    map.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: 'symbol',
      source: STATIONS_SOURCE,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 14,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': '#ffffff' },
    });

    map.addLayer({
      id: POINT_LAYER,
      type: 'circle',
      source: STATIONS_SOURCE,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['match', ['get', 'status'], 'available', '#2dd36f', 'full', '#eb445a', '#8c8c8c'],
        'circle-radius': 9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    map.addLayer({
      id: POINT_NAME_LAYER,
      type: 'symbol',
      source: STATIONS_SOURCE,
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-anchor': 'bottom',
        'text-offset': [0, -1.2],
        'text-max-width': 10,
        // The basemap labels are drawn below this layer and would otherwise hide every station name they touch.
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#1f1f1f',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });

    // Stations on the same spot show one marker with a count badge, drawn at its top right.
    map.addLayer({
      id: STACK_BADGE_LAYER,
      type: 'circle',
      source: STATIONS_SOURCE,
      filter: ['all', ['!', ['has', 'point_count']], ['>', ['get', 'stack'], 1]],
      paint: {
        'circle-color': '#1f1f1f',
        'circle-radius': 7,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
        'circle-translate': [9, -9],
      },
    });

    map.addLayer({
      id: STACK_COUNT_LAYER,
      type: 'symbol',
      source: STATIONS_SOURCE,
      filter: ['all', ['!', ['has', 'point_count']], ['>', ['get', 'stack'], 1]],
      layout: {
        'text-field': ['to-string', ['get', 'stack']],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10,
        'text-offset': [0.9, -0.9],
        'text-allow-overlap': true,
      },
      paint: { 'text-color': '#ffffff' },
    });

    map.addSource(SPIDER_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: SPIDER_LEG_LAYER,
      type: 'line',
      source: SPIDER_SOURCE,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#1f1f1f', 'line-width': 1.5, 'line-opacity': 0.6 },
    });

    map.addLayer({
      id: SPIDER_POINT_LAYER,
      type: 'circle',
      source: SPIDER_SOURCE,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-color': ['match', ['get', 'status'], 'available', '#2dd36f', 'full', '#eb445a', '#8c8c8c'],
        'circle-radius': 9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Names sit on the outer side of each station, so neighbouring names do not run into each other.
    map.addLayer({
      id: SPIDER_NAME_LAYER,
      type: 'symbol',
      source: SPIDER_SOURCE,
      filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-anchor': ['get', 'labelSide'],
        'text-offset': [
          'match',
          ['get', 'labelSide'],
          'left',
          ['literal', [1, 0]],
          'right',
          ['literal', [-1, 0]],
          'top',
          ['literal', [0, 1.2]],
          ['literal', [0, -1.2]],
        ],
        'text-max-width': 10,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#1f1f1f',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });
  }

  private handleClick(event: maplibregl.MapMouseEvent): void {
    const hit = this.map?.queryRenderedFeatures(event.point, {
      layers: [CLUSTER_LAYER, POINT_LAYER, SPIDER_POINT_LAYER, SPIDER_LEG_LAYER],
    })[0];
    if (!hit) {
      this.collapseSpider();
      return;
    }
    if (hit.layer.id === CLUSTER_LAYER) {
      void this.expandCluster(hit);
    } else if (hit.layer.id === POINT_LAYER && (hit.properties['stack'] as number) > 1) {
      this.spiderfy(hit);
    } else if (hit.layer.id !== SPIDER_LEG_LAYER) {
      this.selectStation(hit.properties['id'] as number);
    }
  }

  // Shows the stations of a stack in a ring around it. Their real coordinates do not change, so the ring is only visual.
  private spiderfy(feature: maplibregl.MapGeoJSONFeature): void {
    const map = this.map;
    if (!map) {
      return;
    }
    const key = feature.properties['stackKey'] as string;
    const [lng, lat] = (feature.geometry as Point).coordinates;
    const center = map.project([lng, lat]);
    const members = this.stations()
      .filter((station) => stackKey(station) === key)
      .sort((a, b) => a.id - b.id);

    const features: Feature[] = [];
    members.forEach((station, slot) => {
      const angle = (2 * Math.PI * slot) / members.length;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const point = map.unproject([center.x + SPIDER_RADIUS_PX * cos, center.y + SPIDER_RADIUS_PX * sin]);
      const labelSide = Math.abs(cos) >= Math.abs(sin) ? (cos > 0 ? 'left' : 'right') : sin > 0 ? 'top' : 'bottom';
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng, lat],
            [point.lng, point.lat],
          ],
        },
        properties: {},
      });
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
        properties: { id: station.id, name: station.name, status: markerStatus(station), labelSide },
      });
    });

    this.spiderKey = key;
    map.getSource<maplibregl.GeoJSONSource>(SPIDER_SOURCE)?.setData({ type: 'FeatureCollection', features });
    this.applyStackFilters();
  }

  private collapseSpider(): void {
    if (this.spiderKey === null) {
      return;
    }
    this.spiderKey = null;
    this.map?.getSource<maplibregl.GeoJSONSource>(SPIDER_SOURCE)?.setData({ type: 'FeatureCollection', features: [] });
    this.applyStackFilters();
  }

  // While a stack is spread out, its stacked markers are hidden so only the ring is shown.
  private applyStackFilters(): void {
    const map = this.map;
    if (!map || !this.mapLoaded) {
      return;
    }
    const hidden = this.spiderKey;
    const single: MapFilter =
      hidden === null
        ? ['!', ['has', 'point_count']]
        : ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'stackKey'], hidden]];
    const stacked: MapFilter =
      hidden === null
        ? ['all', ['!', ['has', 'point_count']], ['>', ['get', 'stack'], 1]]
        : ['all', ['!', ['has', 'point_count']], ['>', ['get', 'stack'], 1], ['!=', ['get', 'stackKey'], hidden]];
    map.setFilter(POINT_LAYER, single);
    map.setFilter(POINT_NAME_LAYER, single);
    map.setFilter(STACK_BADGE_LAYER, stacked);
    map.setFilter(STACK_COUNT_LAYER, stacked);
  }

  private pushData(): void {
    if (!this.mapLoaded || !this.map) {
      return;
    }
    const source = this.map.getSource<maplibregl.GeoJSONSource>(STATIONS_SOURCE);
    source?.setData(this.collection);
    if (!this.hasFitted) {
      this.fitToStations(this.map);
    }
  }

  private fitToStations(map: maplibregl.Map, duration = 0): void {
    const bounds = stationsBounds(this.stations());
    if (!bounds) {
      return;
    }
    map.fitBounds(bounds, {
      padding: { top: 160, bottom: 60, left: 40, right: 40 },
      maxZoom: 13,
      duration,
    });
    this.hasFitted = true;
  }

  private showFocusPoint(point: MapPoint | null): void {
    this.searchMarker?.remove();
    this.searchMarker = null;
    if (!this.map) {
      return;
    }
    if (!point) {
      if (this.viewBeforeFocus) {
        this.map.flyTo(this.viewBeforeFocus);
        this.viewBeforeFocus = null;
      }
      return;
    }
    if (!this.viewBeforeFocus) {
      this.viewBeforeFocus = { center: this.map.getCenter(), zoom: this.map.getZoom() };
    }
    const center: [number, number] = [point.longitude, point.latitude];
    this.searchMarker = new maplibregl.Marker({ color: '#3880ff' }).setLngLat(center).addTo(this.map);
    this.map.flyTo({ center, zoom: FOCUS_ZOOM });
  }

  private async expandCluster(feature: maplibregl.MapGeoJSONFeature): Promise<void> {
    const map = this.map;
    if (!map || feature.geometry.type !== 'Point') {
      return;
    }
    const source = map.getSource<maplibregl.GeoJSONSource>(STATIONS_SOURCE);
    const clusterId = feature.properties['cluster_id'] as number;
    const zoom = await source?.getClusterExpansionZoom(clusterId);
    map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
  }

  private selectStation(id: number): void {
    const station = this.stations().find((s) => s.id === id);
    if (station) {
      this.stationSelected.emit(station);
    }
  }
}
