import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, defer, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { ClubEvent } from '../../models/event.model';
import { EventsService } from '../../services/events.service';
import { TicketSelectionService } from '../../services/ticket-selection.service';
import { eventStatus, eventStatusLabel } from '../../utils/event-time';

interface DetailState {
  loading: boolean;
  error: boolean;
  event: ClubEvent | null;
}

@Component({
  selector: 'app-event-detail',
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  standalone: false
})
export class EventDetailComponent {
  private readonly destroyRef = inject(DestroyRef);
  selectionError = '';
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  private readonly state$ = combineLatest([this.route.paramMap, this.reload$]).pipe(
    switchMap(([params]) => defer(() => this.events.getEventById(params.get('eventId') ?? '')).pipe(
      map(event => {
        this.tickets.activateEvent(event?.id ?? null);
        this.selectionError = '';
        return { loading: false, error: false, event };
      }),
      startWith<DetailState>({ loading: true, error: false, event: null }),
      catchError(() => of<DetailState>({ loading: false, error: true, event: null }))
    ))
  );
  readonly view$ = this.state$.pipe(switchMap(state => state.event
    ? this.tickets.forEvent(state.event).pipe(
      map(selection => ({ ...state, selection, status: eventStatusLabel(eventStatus(selection.event)) })),
      catchError(() => of({ ...state, error: true, event: null, selection: null, status: '' }))
    ) : of({ ...state, selection: null, status: '' })));

  constructor(private route: ActivatedRoute, private events: EventsService,
              public tickets: TicketSelectionService) {}

  changeQuantity(eventId: string, ticketId: string, quantity: number): void {
    this.tickets.setQuantity(eventId, ticketId, quantity)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(accepted => {
        this.selectionError = accepted ? '' : 'No se pudo actualizar la selección. Revisa el estado y la disponibilidad del evento.';
      });
  }
  retry(): void { this.reload$.next(); }
}
