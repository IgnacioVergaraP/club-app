import { firstValueFrom, of } from 'rxjs';
import { AdminEventsComponent } from './admin-events.component';
import { AdminEventsService } from './admin-events.service';

describe('AdminEventsComponent list', () => {
  it('combines name search and status filters, including empty results and reset', async () => {
    const component = new AdminEventsComponent(new AdminEventsService());
    component.search.setValue('sessions'); component.status.setValue('published');
    expect((await firstValueFrom(component.view$)).events.length).toBe(1);
    component.status.setValue('cancelled'); expect((await firstValueFrom(component.view$)).events.length).toBe(0);
    component.clearFilters(); expect((await firstValueFrom(component.view$)).events.length).toBe(4);
  });
  it('orders dates in both directions', async () => {
    const component = new AdminEventsComponent(new AdminEventsService());
    expect((await firstValueFrom(component.view$)).events[0].status).toBe('finished');
    component.order.setValue('desc');expect((await firstValueFrom(component.view$)).events[0].status).toBe('cancelled');
  });
  it('exposes a distinct initial empty state', async () => {
    const service = {events$:of([])} as unknown as AdminEventsService;
    const result=await firstValueFrom(new AdminEventsComponent(service).view$);
    expect(result.total).toBe(0);expect(result.events).toEqual([]);
  });
  it('reports a failed publication and restores the visible status selector', async () => {
    const service=new AdminEventsService();const component=new AdminEventsComponent(service);
    const record=(await firstValueFrom(service.events$))[1];
    const target={value:'published'};component.changeStatus(record,{target} as unknown as Event);
    expect(component.error).toContain('Revisa');expect(target.value).toBe('draft');
    expect((await firstValueFrom(service.events$))[1].status).toBe('draft');
  });
});
