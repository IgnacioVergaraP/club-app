import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { AdminEventsService } from './admin-events.service';
import { EVENT_STATUSES, TICKET_STATUSES } from './admin-event.model';
@Component({ selector: 'app-admin-event-detail', standalone: false, templateUrl: './admin-event-detail.component.html', styleUrls: ['./admin-events.component.scss'] })
export class AdminEventDetailComponent {
  readonly event$ = combineLatest([this.service.events$, this.route.paramMap]).pipe(map(([events, params]) => events.find(event => event.id === params.get('id'))));
  constructor(private readonly service: AdminEventsService, private readonly route: ActivatedRoute) {}
  statusLabel(status: string): string { return EVENT_STATUSES.find(item => item.value === status)?.label || status; }
  ticketLabel(status: string): string { return TICKET_STATUSES.find(item => item.value === status)?.label || status; }
}
