import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonItem, IonLabel, IonList, IonSearchbar, IonSpinner, IonText } from '@ionic/angular';
import { Subscription } from 'rxjs';

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

  /** Search text from the URL. A valid value is searched again when the page loads. */
  readonly initialQuery = input('');
  readonly resultSelected = output<GeocodeResult>();
  /** Emits the submitted text, or an empty string when the search is cleared. */
  readonly searchChanged = output<string>();

  protected readonly query = signal('');
  protected readonly searching = signal(false);
  /** null means no search has been run yet. An empty array means the search found nothing. */
  protected readonly results = signal<GeocodeResult[] | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const text = this.initialQuery().trim();
    this.query.set(text);
    if (text.length >= GEOCODING.minQueryLength) {
      this.run(text);
    }
  }

  protected onInput(value: string | null | undefined): void {
    this.query.set(value ?? '');
  }

  /** Search runs only on Enter. Nominatim does not allow autocomplete. */
  protected submit(): void {
    const text = this.query().trim();
    if (text.length < GEOCODING.minQueryLength) {
      this.request?.unsubscribe();
      this.searching.set(false);
      this.results.set(null);
      this.errorMessage.set(`Type at least ${GEOCODING.minQueryLength} characters to search.`);
      return;
    }
    this.searchChanged.emit(text);
    this.run(text);
  }

  protected select(result: GeocodeResult): void {
    this.resultSelected.emit(result);
    this.results.set(null);
  }

  protected clear(): void {
    this.request?.unsubscribe();
    this.query.set('');
    this.searching.set(false);
    this.results.set(null);
    this.errorMessage.set(null);
    this.searchChanged.emit('');
  }

  private run(text: string): void {
    // A new search replaces the one still in flight.
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
