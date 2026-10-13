import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import * as maplibregl from 'maplibre-gl';

import { Station } from '../../core/models/station.model';
import { StationFeatureCollection, stationsBounds, stationsToFeatureCollection } from './station-geojson';

// Free vector style from OpenFreeMap. No API key is needed.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
// MapLibre runs clustering in a web worker. The bundler does not emit that file, so it is
// copied to assets (see angular.json) and its URL is set explicitly.
const MAP_WORKER_URL = '/assets/maplibre/maplibre-gl-worker.mjs';
const STATIONS_SOURCE = 'stations';
const CLUSTER_LAYER = 'clusters';
const CLUSTER_COUNT_LAYER = 'cluster-count';
const POINT_LAYER = 'station-points';
// Oslo city centre, the dataset is centred here
const INITIAL_CENTER: [number, number] = [10.75, 59.92];
const FOCUS_ZOOM = 15;

export interface MapPoint {
  latitude: number;
  longitude: number;
}

/** Turns a browser geolocation error into a message the user can act on. */
export function describeLocationError(error: { code: number } | undefined): string {
  switch (error?.code) {
    case 1: // PERMISSION_DENIED
      return 'Location access is blocked. Allow it in your browser settings to show your position.';
    case 2: // POSITION_UNAVAILABLE
      return 'Your position could not be determined.';
    case 3: // TIMEOUT
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
  /** Moves the map to a searched address and marks it. */
  readonly focusPoint = input<MapPoint | null>(null);
  readonly stationSelected = output<Station>();
  readonly locationFound = output<void>();
  readonly locationError = output<string>();

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private map: maplibregl.Map | null = null;
  private mapLoaded = false;
  private searchMarker: maplibregl.Marker | null = null;
  // Fit the view to the stations only once, so later data updates do not move a view the user changed.
  private hasFitted = false;
  private collection: StationFeatureCollection = { type: 'FeatureCollection', features: [] };

  constructor() {
    afterNextRender(() => this.initMap());

    effect(() => {
      const stations = this.stations();
      this.collection = stationsToFeatureCollection(stations);
      this.pushData();
    });

    effect(() => {
      this.showFocusPoint(this.focusPoint());
    });
  }

  ngOnDestroy(): void {
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
    });
    // Bottom-left keeps the controls clear of the filter bar at the top.
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');

    // The browser asks for permission on the first click. Errors are reported to the page.
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
        'circle-color': ['step', ['get', 'point_count'], '#3880ff', 10, '#2dd36f', 50, '#ffc409'],
        'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 32],
        'circle-stroke-width': 3,
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
        'text-size': 13,
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
        'circle-color': [
          'match',
          ['get', 'status'],
          'available', '#2dd36f',
          'full', '#eb445a',
          /* closed */ '#8c8c8c',
        ],
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

  private fitToStations(map: maplibregl.Map): void {
    const bounds = stationsBounds(this.stations());
    if (!bounds) {
      return;
    }
    // maxZoom stops a single station (or two close ones) from zooming in too far.
    map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
    this.hasFitted = true;
  }

  private showFocusPoint(point: MapPoint | null): void {
    this.searchMarker?.remove();
    this.searchMarker = null;
    if (!point || !this.map) {
      return;
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
