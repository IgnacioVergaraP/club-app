import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, defer, of, timer } from 'rxjs';
import { catchError, distinctUntilChanged, map, startWith, switchMap, take } from 'rxjs/operators';
import { ClubEvent } from '../models/event.model';
import { TicketSelectionView, TicketType } from '../models/ticket.model';
import { EventsService } from './events.service';
import { eventStatus } from '../utils/event-time';

interface SelectionState {
  activeEventId: string | null;
  byEvent: Record<string, Record<string, number>>;
}

const CLP = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

@Injectable({ providedIn: 'root' })
export class TicketSelectionService {
  private readonly state$ = new BehaviorSubject<SelectionState>({ activeEventId: null, byEvent: {} });

  readonly summary$: Observable<TicketSelectionView | null> = this.state$.pipe(
    map(state => state.activeEventId), distinctUntilChanged(),
    switchMap(id => id ? defer(() => this.events.getEventById(id)).pipe(
      switchMap(event => event ? this.forEvent(event) : of(null)),
      catchError(() => of(null))
    ) : of(null))
  );

  constructor(private events: EventsService) {}

  activateEvent(eventId: string | null): void {
    if (this.state$.value.activeEventId !== eventId) {
      this.state$.next({ ...this.state$.value, activeEventId: eventId });
    }
  }

  forEvent(event: ClubEvent): Observable<TicketSelectionView> {
    return combineLatest([
      defer(() => this.events.getTicketTypes(event.id)), this.state$,
      timer(1000, 1000).pipe(startWith(0))
    ]).pipe(map(([types, state]) => this.buildView(event, types, state)));
  }

  /** Revalida contra la fuente local, nunca contra un precio u objeto de la pantalla. */
  setQuantity(eventId: string, ticketId: string, quantity: number): Observable<boolean> {
    return defer(() => combineLatest([
      this.events.getEventById(eventId), this.events.getTicketTypes(eventId)
    ])).pipe(take(1), map(([event, types]) => {
      const ticket = types.find(type => type.id === ticketId && type.eventId === eventId);
      if (!event || event.id !== eventId || eventStatus(event) !== 'upcoming' || !ticket ||
          !this.validType(ticket) || !ticket.available || !Number.isInteger(quantity) ||
          quantity < 0 || quantity > Math.min(ticket.maxQuantity, 10)) {
        return false;
      }
      const state = this.state$.value;
      const quantities = { ...(state.byEvent[eventId] ?? {}) };
      if (quantity === 0) { delete quantities[ticketId]; } else { quantities[ticketId] = quantity; }
      this.state$.next({ activeEventId: eventId, byEvent: { ...state.byEvent, [eventId]: quantities } });
      return true;
    }), catchError(() => of(false)));
  }

  formatClp(value: number): string { return '$' + CLP.format(value); }

  private validType(ticket: TicketType): boolean {
    return Number.isSafeInteger(ticket.priceClp) && ticket.priceClp >= 0 &&
      Number.isInteger(ticket.maxQuantity) && ticket.maxQuantity > 0;
  }

  private buildView(event: ClubEvent, types: TicketType[], state: SelectionState): TicketSelectionView {
    const quantities = { ...(state.byEvent[event.id] ?? {}) };
    const canSelect = eventStatus(event) === 'upcoming';
    const items = [];
    let valid = canSelect;
    for (const [id, quantity] of Object.entries(quantities)) {
      const ticket = types.find(type => type.id === id && type.eventId === event.id);
      if (!ticket || !ticket.available || !this.validType(ticket) || !Number.isInteger(quantity) ||
          quantity <= 0 || quantity > Math.min(ticket.maxQuantity, 10)) {
        valid = false;
        continue;
      }
      items.push({ ticket, quantity, subtotalClp: ticket.priceClp * quantity });
    }
    const totalUnits = items.reduce((total, item) => total + item.quantity, 0);
    const subtotalClp = items.reduce((total, item) => total + item.subtotalClp, 0);
    return { event, types: types.filter(type => type.eventId === event.id), quantities, items,
      subtotals: Object.fromEntries(items.map(item => [item.ticket.id, item.subtotalClp])),
      totalUnits, subtotalClp, serviceFeeClp: 0, totalClp: subtotalClp, canSelect,
      valid: valid && totalUnits > 0 && Number.isSafeInteger(subtotalClp) };
  }
}
