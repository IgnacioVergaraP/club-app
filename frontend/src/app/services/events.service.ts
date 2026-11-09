import { Injectable } from '@angular/core';
import { Observable, defer, of } from 'rxjs';
import { MOCK_EVENTS } from '../data/mock-events';
import { ClubEvent } from '../models/event.model';
import { map } from 'rxjs/operators';
import { TicketType } from '../models/ticket.model';
import { MOCK_TICKET_TYPES } from '../data/mock-ticket-types';

/** Punto de acceso al catálogo: sustituible por HttpClient en una futura etapa. */
@Injectable({ providedIn: 'root' })
export class EventsService {
  getTicketTypes(eventId: string): Observable<TicketType[]> {
    return defer(() => of(MOCK_TICKET_TYPES.filter(ticket => ticket.eventId === eventId)
      .map(ticket => ({ ...ticket }))));
  }

  getEventById(id: string): Observable<ClubEvent | null> {
    return this.getEvents().pipe(map(events => events.find(event => event.id === id) ?? null));
  }

  getEvents(): Observable<ClubEvent[]> {
    return defer(() => of(MOCK_EVENTS.map(event => ({ ...event })).sort((a, b) =>
      Date.parse(a.startsAt) - Date.parse(b.startsAt))));
  }
}
