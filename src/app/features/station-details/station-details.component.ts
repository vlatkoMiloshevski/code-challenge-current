import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  IonBadge,
  IonButton,
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
import { ChargePointStatus, Station, StationDetail } from '../../core/models/station.model';

type DetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; detail: StationDetail };

@Component({
  selector: 'app-station-details',
  templateUrl: 'station-details.component.html',
  styleUrl: 'station-details.component.scss',
  imports: [
    IonButton,
    IonBadge,
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

  readonly station = input.required<Station>();
  /** Shows a close button. Used by the desktop side panel. */
  readonly showClose = input(false);
  readonly closed = output<void>();

  private readonly attempt = signal(0);

  // Reloads whenever the station changes or the user taps retry.
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

  protected statusColor(status: ChargePointStatus): string {
    return status === 'Available' ? 'success' : 'warning';
  }

  /** Strips spaces so "+47 000 00 000" becomes a valid tel: link. */
  protected telHref(phone: string): string {
    return `tel:${phone.replace(/\s+/g, '')}`;
  }
}
