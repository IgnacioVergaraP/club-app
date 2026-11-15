import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AdminEventsComponent } from './admin-events.component';
import { AdminEventsService } from './admin-events.service';

describe('AdminEventsComponent list', () => {
  const router={navigate:()=>Promise.resolve(true)} as unknown as Router;
  it('combines name search and status filters, including empty results and reset', async () => {
    const component = new AdminEventsComponent(new AdminEventsService(),router);
    component.search.setValue('sessions'); component.status.setValue('published');
    expect((await firstValueFrom(component.view$)).events.length).toBe(1);
    component.status.setValue('cancelled'); expect((await firstValueFrom(component.view$)).events.length).toBe(0);
    component.clearFilters(); expect((await firstValueFrom(component.view$)).events.length).toBe(4);
  });
  it('orders dates in both directions', async () => {
    const component = new AdminEventsComponent(new AdminEventsService(),router);
    expect((await firstValueFrom(component.view$)).events[0].status).toBe('finished');
    component.order.setValue('desc');expect((await firstValueFrom(component.view$)).events[0].status).toBe('cancelled');
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
