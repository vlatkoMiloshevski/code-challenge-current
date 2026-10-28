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
import * as maplibregl from 'maplibre-gl';

import { Station } from '../../core/models/station.model';
import { StationFeatureCollection, stationsBounds, stationsToFeatureCollection } from './station-geojson';

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

    map.on('click', CLUSTER_LAYER, (event: maplibregl.MapLayerMouseEvent) => this.expandCluster(event));
    map.on('click', POINT_LAYER, (event: maplibregl.MapLayerMouseEvent) => this.selectStation(event));
    for (const layer of [CLUSTER_LAYER, POINT_LAYER]) {
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
          '#2dd36f',
          50,
          '#ffc409',
          200,
          '#d79118',
          1000,
          '#bb5fb5',
        ],
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 18, 50, 20, 200, 22, 1000, 24],
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

  private async expandCluster(event: maplibregl.MapLayerMouseEvent): Promise<void> {
    const map = this.map;
    const feature = event.features?.[0];
    if (!map || !feature || feature.geometry.type !== 'Point') {
      return;
    }
    const source = map.getSource<maplibregl.GeoJSONSource>(STATIONS_SOURCE);
    const clusterId = feature.properties['cluster_id'] as number;
    const zoom = await source?.getClusterExpansionZoom(clusterId);
    map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
  }

  private selectStation(event: maplibregl.MapLayerMouseEvent): void {
    const id = event.features?.[0]?.properties['id'] as number | undefined;
    const station = this.stations().find((s) => s.id === id);
    if (station) {
      this.stationSelected.emit(station);
    }
  }
}
