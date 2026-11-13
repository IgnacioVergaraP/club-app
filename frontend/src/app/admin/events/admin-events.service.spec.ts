import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AdminEventsService } from './admin-events.service';
import { ADMIN_DEMO_EVENTS } from './admin-events.data';
import { AdminEventDraft } from './admin-event.model';
import { EventsService } from '../../services/events.service';

const draft = (): AdminEventDraft => ({ ...ADMIN_DEMO_EVENTS[0], ticketTypes: ADMIN_DEMO_EVENTS[0].ticketTypes.map(type => ({ ...type })) });
describe('AdminEventsService DEMO', () => {
  let service: AdminEventsService;
  beforeEach(() => { service = new AdminEventsService(); });
  it('creates a local record with stable ID, trims names and isolates copies', async () => {
    const input = { ...draft(), name: '  Nueva noche  ' };
    const saved = service.save(input);
    input.ticketTypes[0].capacity = 1; saved.ticketTypes[0].name = 'mutated';
    const records = await firstValueFrom(service.events$);
    expect(records.length).toBe(5);
    expect(records[4].name).toBe('Nueva noche');
    expect(records[4].id).toBe('admin-demo-event-005');
    expect(records[4].ticketTypes[0].capacity).toBe(100);
    expect(records[4].ticketTypes[0].name).toBe('General');
    expect(records[4].isDemo).toBeTrue();
  });
  it('edits without duplicate records and emits independent subscription snapshots', async () => {
    const first = await firstValueFrom(service.events$); first[0].ticketTypes.length = 0;
    service.save({ ...draft(), name:'Editado' }, ADMIN_DEMO_EVENTS[0].id);
    const records = await firstValueFrom(service.events$);
    expect(records.length).toBe(4); expect(records[0].name).toBe('Editado'); expect(records[0].ticketTypes.length).toBe(2);
  });
  it('distinguishes cancelled and finished and does not infer payment or publication from dates', async () => {
    service.changeStatus(ADMIN_DEMO_EVENTS[0].id, 'cancelled');
    expect((await firstValueFrom(service.events$))[0].status).toBe('cancelled');
    service.changeStatus(ADMIN_DEMO_EVENTS[0].id, 'finished');
    expect((await firstValueFrom(service.events$))[0].status).toBe('finished');
    service.changeStatus(ADMIN_DEMO_EVENTS[0].id, 'draft');
    expect((await firstValueFrom(service.events$))[0].status).toBe('draft');
  });
  it('blocks publishing without a ticket type without mutating the record', async () => {
    expect(() => service.changeStatus(ADMIN_DEMO_EVENTS[1].id, 'published')).toThrow();
    expect((await firstValueFrom(service.events$))[1].status).toBe('draft');
    expect(() => service.save({ ...draft(), ticketTypes:[] })).toThrow();
  });
  for (const [label, change] of [
    ['blank name', {name:'   '}], ['calendar overflow', {date:'2026-02-30'}], ['same-day reversed time', {endsNextDay:false}],
    ['duration over 24 hours', {startsAt:'01:00', endsAt:'23:00', endsNextDay:true}], ['external image', {image:'https://example.com/image.png'}]
  ] as [string, Partial<AdminEventDraft>][]) {
    it('rejects '+label, () => { expect(() => service.save({...draft(), ...change})).toThrow(); });
  }
  it('rejects negative/fractional prices, invalid capacity, excess purchase limits and duplicate names', () => {
    for(const patch of [{priceClp:-1}, {priceClp:1.5}, {capacity:0}, {maxPerPurchase:101}, {maxPerPurchase:10, capacity:5}, {name:'   '}]) {
      const input=draft();Object.assign(input.ticketTypes[0],patch);expect(()=>service.save(input)).toThrow();
    }
    const input=draft();input.ticketTypes[1].name=' general ';expect(()=>service.save(input)).toThrow();
  });
  it('accepts free tickets and overnight hours with explicit next-day flag', () => {
    const input=draft();input.ticketTypes[0].priceClp=0;
    expect(service.save(input).ticketTypes[0].priceClp).toBe(0);
    expect(service.save({...input,status:'draft', ticketTypes:[]}).status).toBe('draft');
  });
  it('rejects unknown IDs and resets local changes in a new service instance', async () => {
    expect(()=>service.save(draft(),'missing')).toThrow();expect(()=>service.changeStatus('missing','draft')).toThrow();
    service.save({...draft(),name:'Temporal'});
    expect((await firstValueFrom(new AdminEventsService().events$)).length).toBe(4);
  });
  it('does not write HTTP or alter the public event catalogue', async () => {
    TestBed.configureTestingModule({imports:[HttpClientTestingModule]});
    const publicService=TestBed.inject(EventsService);
    const before=await firstValueFrom(publicService.getEvents());
    service.save({...draft(),name:'Solo administración'});
    expect(await firstValueFrom(publicService.getEvents())).toEqual(before);
    TestBed.inject(HttpTestingController).expectNone(()=>true);TestBed.inject(HttpTestingController).verify();
  });
});
