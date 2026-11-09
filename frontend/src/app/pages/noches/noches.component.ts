import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, defer, of, timer } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { ClubEvent } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { eventStatus, eventStatusLabel } from '../../utils/event-time';

type Period = 'all' | 'upcoming' | 'past';
interface EventsState {
  loading: boolean;
  error: boolean;
  events: ClubEvent[];
}

@Component({
  selector: 'app-noches',
  templateUrl: './noches.component.html',
  styleUrls: ['./noches.component.scss'],
  standalone: false
})
export class NochesComponent {
  readonly periods: { value: Period; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'upcoming', label: 'Próximos' },
    { value: 'past', label: 'Anteriores' }
  ];
  private readonly period$ = new BehaviorSubject<Period>('all');
  private readonly category$ = new BehaviorSubject<string>('');
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  private readonly state$ = this.reload$.pipe(switchMap(() =>
    defer(() => this.events.getEvents()).pipe(
      map(events => ({ loading: false, error: false, events })),
      startWith<EventsState>({ loading: true, error: false, events: [] }),
      catchError(() => of<EventsState>({ loading: false, error: true, events: [] }))
    )
  ));
  readonly view$ = combineLatest([
    this.state$, this.period$, this.category$, timer(0, 30000)
  ]).pipe(map(([state, period, category]) => {
    const now = Date.now();
    const cards = state.events.filter(event => {
      const status = eventStatus(event, now);
      return (period === 'all' || (period === 'upcoming' && status === 'upcoming') ||
        (period === 'past' && status === 'ended')) && (!category || event.category === category);
    }).map(event => ({ event, status: eventStatus(event, now) }));
    return {
      ...state, cards, period, category,
      categories: [...new Set(state.events.map(event => event.category))].sort()
    };
  }));
  readonly statusLabel = eventStatusLabel;

  constructor(private events: EventsService) {}

  setPeriod(period: Period): void { this.period$.next(period); }
  setCategory(category: string): void { this.category$.next(category); }
  resetFilters(): void { this.period$.next('all'); this.category$.next(''); }
  retry(): void { this.reload$.next(); }
  trackEvent(_: number, card: { event: ClubEvent }): string { return card.event.id; }
}
