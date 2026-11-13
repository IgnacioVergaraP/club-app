import { Component, OnDestroy } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { AdminEventsService } from './admin-events.service';
import { AdminEventDraft, AdminTicketType, EVENT_IMAGES, EVENT_LIMITS, EVENT_STATUSES, TICKET_STATUSES } from './admin-event.model';
import { eventDateValidator, eventFormValidator, integerRange, requiredTrimmed, ticketCapacityValidator } from './admin-event.validation';

@Component({ selector: 'app-admin-event-form', standalone: false, templateUrl: './admin-event-form.component.html', styleUrls: ['./admin-event-form.component.scss'] })
export class AdminEventFormComponent implements OnDestroy {
  readonly limits = EVENT_LIMITS;
  readonly images = EVENT_IMAGES;
  readonly statuses = EVENT_STATUSES;
  readonly ticketStatuses = TICKET_STATUSES;
  id?: string;
  private readonly destroyed$ = new Subject<void>();
  missing = false;
  error = '';
  readonly form = new FormGroup({
    name: new FormControl('', {nonNullable:true, validators:[requiredTrimmed, Validators.maxLength(EVENT_LIMITS.name)]}),
    description: new FormControl('', {nonNullable:true, validators:[Validators.maxLength(EVENT_LIMITS.description)]}),
    date: new FormControl('', {nonNullable:true, validators:[eventDateValidator]}),
    startsAt: new FormControl('23:00', {nonNullable:true, validators:[Validators.required]}),
    endsAt: new FormControl('05:00', {nonNullable:true, validators:[Validators.required]}),
    endsNextDay: new FormControl(true, {nonNullable:true}),
    image: new FormControl<string>(EVENT_IMAGES[0].value, {nonNullable:true, validators:[Validators.required]}),
    status: new FormControl<AdminEventDraft['status']>('draft', {nonNullable:true, validators:[Validators.required]}),
    ticketTypes: new FormArray<ReturnType<AdminEventFormComponent['ticketGroup']>>([])
  }, { validators: [eventFormValidator] });
  constructor(private readonly service: AdminEventsService, private readonly route: ActivatedRoute, private readonly router: Router) {
    this.route.paramMap.pipe(takeUntil(this.destroyed$)).subscribe(params => {
      this.id = params.get('id') || undefined;
      this.missing = false; this.error = '';
      this.form.controls.ticketTypes.clear();
      this.form.reset({name:'', description:'', date:'', startsAt:'23:00', endsAt:'05:00', endsNextDay:true, image:EVENT_IMAGES[0].value, status:'draft'});
      if (this.id) this.service.events$.pipe(take(1)).subscribe(events => {
        const event = events.find(item => item.id === this.id);
        if (!event) { this.missing = true; return; }
        this.form.patchValue(event);
        event.ticketTypes.forEach(type => this.form.controls.ticketTypes.push(this.ticketGroup(type)));
      });
    });
  }
  ngOnDestroy(): void { this.destroyed$.next(); this.destroyed$.complete(); }
  ticketGroup(type?: AdminTicketType) {
    return new FormGroup({
      name: new FormControl(type?.name || '', {nonNullable:true, validators:[requiredTrimmed, Validators.maxLength(EVENT_LIMITS.ticketName)]}),
      priceClp: new FormControl(type?.priceClp ?? 0, {nonNullable:true, validators:[integerRange(0, EVENT_LIMITS.priceClp)]}),
      capacity: new FormControl(type?.capacity ?? 100, {nonNullable:true, validators:[integerRange(1, EVENT_LIMITS.capacity)]}),
      maxPerPurchase: new FormControl(type?.maxPerPurchase ?? 10, {nonNullable:true, validators:[integerRange(1, EVENT_LIMITS.maxPerPurchase)]}),
      status: new FormControl<AdminTicketType['status']>(type?.status || 'available', {nonNullable:true, validators:[Validators.required]})
    }, { validators:[ticketCapacityValidator] });
  }
  addTicket(): void { if (this.form.controls.ticketTypes.length < EVENT_LIMITS.ticketTypes) this.form.controls.ticketTypes.push(this.ticketGroup()); }
  removeTicket(index: number): void { this.form.controls.ticketTypes.removeAt(index); }
  invalid(control: FormControl): boolean { return control.invalid && control.touched; }
  submit(): void {
    this.error = ''; this.form.markAllAsTouched();
    if (this.form.invalid || this.missing) { this.error = 'Revisa los campos marcados antes de guardar.'; return; }
    try { const event = this.service.save(this.form.getRawValue(), this.id); void this.router.navigate(['/admin/eventos', event.id]); }
    catch (error) { this.error = (error as Error).message; }
  }
}
