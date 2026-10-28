import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonItem, IonLabel, IonList, IonSearchbar, IonSpinner, IonText } from '@ionic/angular';
import { Subject, Subscription, debounceTime, filter } from 'rxjs';

import { GEOCODING } from '../../core/config/geocoding.config';
import { GeocodeResult, GeocodingService } from '../../core/services/geocoding.service';

@Component({
  selector: 'app-address-search',
  templateUrl: 'address-search.component.html',
  styleUrl: 'address-search.component.scss',
  imports: [IonSearchbar, IonList, IonItem, IonLabel, IonSpinner, IonText],
})
export class AddressSearchComponent implements OnInit {
  private readonly geocoding = inject(GeocodingService);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | null = null;

  // Empty text means "no pending search": clear() and submit() push it to cancel the debounce.
  private readonly typed = new Subject<string>();

  constructor() {
    this.typed
      .pipe(
        debounceTime(GEOCODING.searchDelayMs),
        filter((text) => text.length >= GEOCODING.minQueryLength),
        takeUntilDestroyed(),
      )
      .subscribe((text) => this.search(text));
  }

  readonly initialQuery = input('');
  readonly resultSelected = output<GeocodeResult>();
  readonly searchChanged = output<string>();

  protected readonly query = signal('');
  protected readonly searching = signal(false);
  protected readonly results = signal<GeocodeResult[] | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    // The text from the URL is shown, but no search runs until the user types again.
    this.query.set(this.initialQuery().trim());
  }

  protected onInput(value: string | null | undefined): void {
    this.query.set(value ?? '');
    this.typed.next(this.query().trim());
  }

  protected submit(): void {
    this.typed.next('');
    const text = this.query().trim();
    if (text.length < GEOCODING.minQueryLength) {
      this.request?.unsubscribe();
      this.searching.set(false);
      this.results.set(null);
      this.errorMessage.set(`Type at least ${GEOCODING.minQueryLength} characters to search.`);
      return;
    }
    this.search(text);
  }

  protected select(result: GeocodeResult): void {
    this.resultSelected.emit(result);
    this.searchChanged.emit(result.label);
    this.results.set(null);
  }

  protected clear(): void {
    this.typed.next('');
    this.request?.unsubscribe();
    this.query.set('');
    this.searching.set(false);
    this.results.set(null);
    this.errorMessage.set(null);
    this.searchChanged.emit('');
  }

  private search(text: string): void {
    this.run(text);
  }

  private run(text: string): void {
    this.request?.unsubscribe();
    this.searching.set(true);
    this.errorMessage.set(null);
    this.results.set(null);

    this.request = this.geocoding
      .search(text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (found) => {
          this.results.set(found);
          this.searching.set(false);
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.searching.set(false);
        },
      });
  }
}
