import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { eventEndDate, eventInstant, eventScheduleSummary, formatEventDay } from './admin-event-dates';
import { BehaviorSubject, combineLatest, map, startWith, timer } from 'rxjs';
import { AdminEventsService } from './admin-events.service';
import { AdminEvent, AdminEventStatus, EVENT_STATUSES } from './admin-event.model';

@Component({ selector: 'app-admin-events', standalone: false, templateUrl: './admin-events.component.html', styleUrls: ['./admin-events.component.scss'] })
export class AdminEventsComponent {
  readonly period$ = new BehaviorSubject<'upcoming' | 'past'>('upcoming');
  readonly statuses = EVENT_STATUSES;
  message = '';
  error = '';
  readonly view$ = combineLatest([this.service.events$, this.period$, timer(30000, 30000).pipe(startWith(0))]).pipe(map(([all, period]) => {
    const now = Date.now();
    const past = (event: AdminEvent) => {
      const end = eventInstant(eventEndDate(event), event.endsAt) ?? eventInstant(event.date, event.startsAt);
      return event.status === 'finished' || (end !== null && end <= now);
    };
    return { total: all.length, period, events: all.filter(event => past(event) === (period === 'past'))
      .sort((a, b) => (a.date + a.startsAt).localeCompare(b.date + b.startsAt) * (period === 'past' ? -1 : 1)) };
  }));
  selectPeriod(period: 'upcoming' | 'past'): void { this.period$.next(period); }
  periodKey(event: KeyboardEvent, period: 'upcoming' | 'past'): void {
    let next: 'upcoming' | 'past';
    if (event.key === 'Home') next = 'upcoming';
    else if (event.key === 'End') next = 'past';
    else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = period === 'upcoming' ? 'past' : 'upcoming';
    else return;
    event.preventDefault(); this.selectPeriod(next); document.getElementById('events-tab-' + next)?.focus();
  }
  constructor(private readonly service: AdminEventsService, private readonly router:Router) {}
  label(status: AdminEventStatus): string { return this.statuses.find(item => item.value === status)!.label; }
  minPrice(event: AdminEvent): number | null { const prices=event.ticketTypes.filter(type=>!!type.name.trim()).map(type=>type.priceClp).filter((price):price is number=>price!==null&&Number.isSafeInteger(price)&&price>=0);return prices.length?Math.min(...prices):null; }
  schedule(event:AdminEvent):string{return eventScheduleSummary(event.date,event.startsAt,eventEndDate(event),event.endsAt);}
  day(date:string):string{return formatEventDay(date);}
  duplicate(event:AdminEvent):void{this.error='';try{const copy=this.service.duplicate(event.id);void this.router.navigate(['/admin/eventos',copy.id,'editar']);}catch(error){this.error=(error as Error).message;}}
  changeStatus(event: AdminEvent, target: Event): void {
    this.error = ''; this.message = '';
    try { this.service.changeStatus(event.id, (target.target as HTMLSelectElement).value as AdminEventStatus); this.message = `Estado de ${event.name} actualizado.`; }
    catch (error) { this.error = (error as Error).message; (target.target as HTMLSelectElement).value = event.status; }
  }
}
