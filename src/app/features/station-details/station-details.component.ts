import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  IonBadge,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { StationApiService } from '../../core/services/station-api.service';
import { Station, StationDetail } from '../../core/models/station.model';
import { FavoritesService } from '../favorites/favorites.service';
import { MarkerStatus, markerStatus } from '../map/station-geojson';

const SUMMARY_LABELS = { available: 'Open', full: 'Full', closed: 'Closed' } as const;

type DetailState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; detail: StationDetail };

@Component({
  selector: 'app-station-details',
  templateUrl: 'station-details.component.html',
  styleUrl: 'station-details.component.scss',
  imports: [
    DecimalPipe,
    IonButton,
    IonBadge,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonSpinner,
    IonText,
  ],
})
export class StationDetailsComponent {
  private readonly stationApi = inject(StationApiService);
  protected readonly favorites = inject(FavoritesService);

  protected readonly starIcon = '/assets/icons/star.svg';
  protected readonly starOutlineIcon = '/assets/icons/star-outline.svg';
  protected readonly closeIcon = '/assets/icons/close.svg';

  readonly station = input.required<Station>();
  readonly showClose = input(false);
  readonly closed = output<void>();

  private readonly attempt = signal(0);

  private readonly state = toSignal(
    toObservable(computed(() => ({ station: this.station(), attempt: this.attempt() }))).pipe(
      switchMap(({ station }) =>
        this.stationApi.getStationDetail(station).pipe(
          map((detail): DetailState => ({ status: 'ready', detail })),
          catchError((error: Error) => of<DetailState>({ status: 'error', message: error.message })),
          startWith<DetailState>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as DetailState },
  );

  protected readonly loading = computed(() => this.state().status === 'loading');
  protected readonly errorMessage = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.message : null;
  });
  protected readonly detail = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.detail : null;
  });

  protected retry(): void {
    this.attempt.update((n) => n + 1);
  }

  protected summaryLabel(station: Station): string {
    return SUMMARY_LABELS[markerStatus(station)];
  }

  protected markerStatusOf(station: Station): MarkerStatus {
    return markerStatus(station);
  }

  protected toggleStation(): void {
    this.favorites.toggleStation(this.station().id);
  }

  protected toggleChargePoint(chargePointId: number): void {
    this.favorites.toggleChargePoint(this.station().id, chargePointId);
  }

  protected telHref(phone: string): string {
    return `tel:${phone.replace(/\s+/g, '')}`;
  }
}
