import { EventsService } from './events.service';
import { ClubEvent } from '../models/event.model';

describe('EventsService', () => {
  it('recupera un evento por su ID real y devuelve null para IDs desconocidos', () => {
    const service = new EventsService();
    service.getEventById('demo-after-hours').subscribe(event => expect(event?.name).toBe('After Hours'));
    service.getEventById('no-existe').subscribe(event => expect(event).toBeNull());
  });

  it('devuelve el catálogo local en orden cronológico y marcado como demostración', () => {
    new EventsService().getEvents().subscribe(events => {
      expect(events.length).toBe(3);
      expect(events.every(event => event.isDemo)).toBeTrue();
      expect(new Set(events.map(event => event.id)).size).toBe(events.length);
      expect(events.map(event => Date.parse(event.startsAt))).toEqual(
        events.map(event => Date.parse(event.startsAt)).sort((a, b) => a - b));
    });
  });

  it('protege los mocks frente a cambios de un consumidor o una nueva suscripción', () => {
    const stream = new EventsService().getEvents();
    let first: ClubEvent[] = [];
    stream.subscribe(events => { first = events; events[0].name = 'Modificado'; });
    stream.subscribe(events => {
      expect(events[0].name).toBe('VOID Sessions');
      expect(events).not.toBe(first);
      expect(events[0]).not.toBe(first[0]);
    });
  });
});
