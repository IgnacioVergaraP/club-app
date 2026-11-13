import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { ADMIN_DEMO_EVENTS } from './admin-events.data';
import { AdminEvent, AdminEventDraft, AdminEventStatus } from './admin-event.model';
import { validateAdminEvent } from './admin-event.validation';

const copy = (event: AdminEvent): AdminEvent => ({ ...event, ticketTypes: event.ticketTypes.map(type => ({ ...type })) });
@Injectable()
export class AdminEventsService {
  private nextId = 5;
  private readonly records = new BehaviorSubject<AdminEvent[]>(ADMIN_DEMO_EVENTS.map(copy));
  readonly events$ = this.records.pipe(map(events => events.map(copy)));

  save(draft: AdminEventDraft, id?: string): AdminEvent {
    validateAdminEvent(draft);
    if (id && !this.records.value.some(event => event.id === id)) throw new Error('Este evento DEMO ya no está disponible.');
    const record: AdminEvent = { ...draft, id: id || `admin-demo-event-${String(this.nextId++).padStart(3, '0')}`, isDemo: true,
      name: draft.name.trim(), description: draft.description.trim(), ticketTypes: draft.ticketTypes.map(type => ({ ...type, name: type.name.trim() })) };
    this.records.next(id ? this.records.value.map(event => event.id === id ? record : event) : [...this.records.value, record]);
    return copy(record);
  }

  changeStatus(id: string, status: AdminEventStatus): void {
    const record = this.records.value.find(event => event.id === id);
    if (!record) throw new Error('Este evento DEMO ya no está disponible.');
    this.save({ ...copy(record), status }, id);
  }
}
