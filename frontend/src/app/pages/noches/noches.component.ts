import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, defer, of, timer } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { ClubEvent } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { eventStatus, eventStatusLabel } from '../../utils/event-time';

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
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  private readonly state$ = this.reload$.pipe(switchMap(() =>
    defer(() => this.events.getEvents()).pipe(
      map(events => ({ loading: false, error: false, events })),
      startWith<EventsState>({ loading: true, error: false, events: [] }),
      catchError(() => of<EventsState>({ loading: false, error: true, events: [] }))
    )
  ));
  readonly view$ = combineLatest([this.state$, timer(0, 30000)]).pipe(map(([state]) => {
    const now = Date.now();
    // Same UTC−3 calendar day used by the client date labels.
    const today = new Date(now - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const cards = state.events.filter(event => {
      const startsAt = Date.parse(event.startsAt);
      const day = new Date(startsAt - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return day >= today || eventStatus(event, now) === 'ongoing';
    }).map(event => ({ event, status: eventStatus(event, now) }));
    return { ...state, cards };
  }));
  readonly statusLabel = eventStatusLabel;

  constructor(private events: EventsService) {}

  retry(): void { this.reload$.next(); }
  trackEvent(_: number, card: { event: ClubEvent }): string { return card.event.id; }
}
