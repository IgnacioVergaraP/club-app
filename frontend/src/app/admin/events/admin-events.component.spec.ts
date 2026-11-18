import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AdminEventsComponent } from './admin-events.component';
import { AdminEventsService } from './admin-events.service';

describe('AdminEventsComponent list', () => {
  const router={navigate:()=>Promise.resolve(true)} as unknown as Router;
  beforeEach(() => spyOn(Date, 'now').and.returnValue(Date.parse('2026-11-18T12:00:00Z')));
  it('opens upcoming events and separates the past without filters', async () => {
    const component = new AdminEventsComponent(new AdminEventsService(),router);
    const upcoming = await firstValueFrom(component.view$);
    expect(upcoming.period).toBe('upcoming'); expect(upcoming.events.length).toBe(3);
    expect(upcoming.events.map(e=>e.status)).not.toContain('finished');
    component.selectPeriod('past');
    expect((await firstValueFrom(component.view$)).events.map(e=>e.status)).toEqual(['finished']);
  });
  it('moves expired dates to the past even without a manual status change', async () => {
    (Date.now as jasmine.Spy).and.returnValue(Date.parse('2026-12-01T12:00:00Z'));
    const component = new AdminEventsComponent(new AdminEventsService(),router);
    expect((await firstValueFrom(component.view$)).events.length).toBe(0);
    component.selectPeriod('past'); expect((await firstValueFrom(component.view$)).events.length).toBe(4);
  });
  it('keeps an overnight event in upcoming until it ends', async () => {
    (Date.now as jasmine.Spy).and.returnValue(Date.parse('2026-11-21T06:00:00Z'));
    const component = new AdminEventsComponent(new AdminEventsService(),router);
    expect((await firstValueFrom(component.view$)).events[0].name).toBe('VOID Sessions');
    (Date.now as jasmine.Spy).and.returnValue(Date.parse('2026-11-21T08:00:00Z'));
    expect((await firstValueFrom(component.view$)).events.map(e=>e.name)).not.toContain('VOID Sessions');
  });
  it('exposes a distinct initial empty state', async () => {
    const service = {events$:of([])} as unknown as AdminEventsService;
    const result=await firstValueFrom(new AdminEventsComponent(service,router).view$);
    expect(result.total).toBe(0);expect(result.events).toEqual([]);
  });
  it('reports a failed publication and restores the visible status selector', async () => {
    const service=new AdminEventsService();const component=new AdminEventsComponent(service,router);
    const record=(await firstValueFrom(service.events$))[1];
    const target={value:'published'};component.changeStatus(record,{target} as unknown as Event);
    expect(component.error).toContain('Revisa');expect(target.value).toBe('draft');
    expect((await firstValueFrom(service.events$))[1].status).toBe('draft');
  });
  it('duplicates a selected event and opens the same editor for the new ID',async()=>{
    const service=new AdminEventsService();const component=new AdminEventsComponent(service,router);const navigate=spyOn(router,'navigate').and.resolveTo(true);
    component.duplicate((await firstValueFrom(service.events$))[0]);const records=await firstValueFrom(service.events$);
    expect(records[4].status).toBe('draft');expect(navigate).toHaveBeenCalledWith(['/admin/eventos',records[4].id,'editar']);
  });

});
