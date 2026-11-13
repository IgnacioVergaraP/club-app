import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { combineLatest, defer, map, startWith } from 'rxjs';
import { AdminEventsService } from './admin-events.service';
import { AdminEvent, AdminEventStatus, EVENT_STATUSES } from './admin-event.model';

@Component({ selector: 'app-admin-events', standalone: false, templateUrl: './admin-events.component.html', styleUrls: ['./admin-events.component.scss'] })
export class AdminEventsComponent {
  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('', { nonNullable: true });
  readonly order = new FormControl('asc', { nonNullable: true });
  readonly statuses = EVENT_STATUSES;
  message = '';
  error = '';
  readonly view$ = combineLatest([this.service.events$, defer(() => this.search.valueChanges.pipe(startWith(this.search.value))), defer(() => this.status.valueChanges.pipe(startWith(this.status.value))), defer(() => this.order.valueChanges.pipe(startWith(this.order.value)))]).pipe(map(([all, query, status, order]) => ({
    total: all.length,
    events: all.filter(event => event.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')) && (!status || event.status === status))
      .sort((a, b) => (a.date + a.startsAt).localeCompare(b.date + b.startsAt) * (order === 'asc' ? 1 : -1))
  })));
  constructor(private readonly service: AdminEventsService) {}
  label(status: AdminEventStatus): string { return this.statuses.find(item => item.value === status)!.label; }
  minPrice(event: AdminEvent): number | null { return event.ticketTypes.length ? Math.min(...event.ticketTypes.map(type => type.priceClp)) : null; }
  changeStatus(event: AdminEvent, target: Event): void {
    this.error = ''; this.message = '';
    try { this.service.changeStatus(event.id, (target.target as HTMLSelectElement).value as AdminEventStatus); this.message = `Estado de ${event.name} actualizado en esta sesión DEMO.`; }
    catch (error) { this.error = (error as Error).message; (target.target as HTMLSelectElement).value = event.status; }
  }
  clearFilters(): void { this.search.setValue(''); this.status.setValue(''); this.order.setValue('asc'); }
}
