import { fakeAsync, tick } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { MOCK_EVENTS } from '../data/mock-events';
import { MOCK_TICKET_TYPES } from '../data/mock-ticket-types';
import { EventsService } from './events.service';
import { TicketSelectionService } from './ticket-selection.service';

describe('TicketSelectionService', () => {
  let service: TicketSelectionService;
  let events: jasmine.SpyObj<EventsService>;
  const first = MOCK_EVENTS[0];
  const second = MOCK_EVENTS[1];
  const general = `${first.id}-general`;
  const vip = `${first.id}-vip`;

  beforeEach(() => {
    spyOn(Date, 'now').and.returnValue(Date.parse('2026-11-02T18:00:00Z'));
    events = jasmine.createSpyObj<EventsService>('EventsService', ['getEventById', 'getTicketTypes']);
    events.getEventById.and.callFake(id => of(MOCK_EVENTS.find(event => event.id === id) ?? null));
    events.getTicketTypes.and.callFake(id => of(MOCK_TICKET_TYPES.filter(ticket => ticket.eventId === id).map(ticket => ({ ...ticket }))));
    service = new TicketSelectionService(events);
  });

  function read<T>(stream: Observable<T>): T {
    let result!: T;
    const sub = stream.subscribe(value => { result = value; });
    tick(); sub.unsubscribe();
    return result;
  }
  function set(id: string, quantity: number, eventId = first.id): boolean {
    let result = false;
    service.setQuantity(eventId, id, quantity).subscribe(value => { result = value; });
    return result;
  }

  it('calcula General y VIP en enteros CLP, sin comisión al comprador', fakeAsync(() => {
    expect(set(general, 2)).toBeTrue(); expect(set(vip, 1)).toBeTrue();
    const view = read(service.summary$)!;
    expect(view.valid).toBeTrue(); expect(view.totalUnits).toBe(3);
    expect(view.subtotals[general]).toBe(24000); expect(view.subtotals[vip]).toBe(25000);
    expect(view.subtotalClp).toBe(49000); expect(view.totalClp).toBe(49000);
    expect(view.serviceFeeClp).toBe(0); expect(service.formatClp(view.totalClp)).toBe('$49.000');
  }));

  it('permite 0 y 10 y rechaza negativos, decimales, booleanos y más de 10', fakeAsync(() => {
    expect(set(general, 10)).toBeTrue();
    for (const quantity of [-1, 11, 1.5, NaN, Infinity, true, '2']) {
      expect(set(general, quantity as number)).toBeFalse();
    }
    expect(read(service.forEvent(first)).quantities[general]).toBe(10);
    expect(set(general, 0)).toBeTrue(); expect(read(service.summary$)?.valid).toBeFalse();
  }));

  it('rechaza eventos inexistentes, tipos desconocidos y entradas de otro evento', fakeAsync(() => {
    expect(set(general, 1, 'no-existe')).toBeFalse();
    expect(set('no-existe', 1)).toBeFalse();
    expect(set(general, 1, second.id)).toBeFalse();
    expect(read(service.summary$)).toBeNull();
  }));

  it('bloquea tipos no disponibles y respeta el máximo específico', fakeAsync(() => {
    events.getTicketTypes.and.returnValue(of([{ ...MOCK_TICKET_TYPES[0], available: false }]));
    expect(set(general, 1)).toBeFalse();
    events.getTicketTypes.and.returnValue(of([{ ...MOCK_TICKET_TYPES[0], maxQuantity: 3 }]));
    expect(set(general, 4)).toBeFalse(); expect(set(general, 3)).toBeTrue();
  }));

  it('bloquea eventos en curso y finalizados, e invalida una selección anterior', fakeAsync(() => {
    expect(set(general, 1)).toBeTrue();
    const now = spyOn(Date, 'now');
    now.and.returnValue(Date.parse('2026-11-08T03:00:00Z'));
    expect(set(general, 2)).toBeFalse(); expect(read(service.summary$)?.valid).toBeFalse();
    now.and.returnValue(Date.parse('2026-11-09T18:00:00Z'));
    expect(set(general, 2)).toBeFalse(); expect(read(service.forEvent(first)).canSelect).toBeFalse();
  }));

  it('separa eventos, conserva sus cantidades y usa el evento activo para el resumen', fakeAsync(() => {
    set(general, 2); service.activateEvent(second.id);
    expect(read(service.summary$)?.valid).toBeFalse();
    const other = `${second.id}-vip`;
    expect(set(other, 1, second.id)).toBeTrue();
    const summary = read(service.summary$)!;
    expect(summary.event.id).toBe(second.id); expect(summary.items.length).toBe(1);
    expect(summary.totalClp).toBe(25000); expect(summary.quantities[general]).toBeUndefined();
    service.activateEvent(first.id);
    expect(read(service.summary$)?.totalClp).toBe(24000);
  }));

  it('invalida el resumen si la disponibilidad cambia', fakeAsync(() => {
    set(general, 1);
    events.getTicketTypes.and.returnValue(of([{ ...MOCK_TICKET_TYPES[0], available: false }]));
    expect(read(service.summary$)?.valid).toBeFalse();
  }));

  it('comienza sin selección y no expone referencias mutables de las cantidades', fakeAsync(() => {
    expect(read(service.summary$)).toBeNull();
    set(general, 1);
    const view = read(service.forEvent(first)); view.quantities[general] = 99;
    expect(read(service.forEvent(first)).quantities[general]).toBe(1);
  }));
});
