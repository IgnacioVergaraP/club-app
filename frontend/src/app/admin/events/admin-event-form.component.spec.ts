import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { AdminEventsService } from './admin-events.service';
import { AdminEventFormComponent } from './admin-event-form.component';
import { AdminEventProgressComponent } from './admin-event-progress.component';
import { AdminEventPreviewComponent } from './admin-event-preview.component';
import { AdminEventTicketsComponent } from './admin-event-tickets.component';
import { AdminEventDraft } from './admin-event.model';

describe('AdminEventFormComponent', () => {
  let component: AdminEventFormComponent;
  let service: AdminEventsService;
  const valid = {name:'Evento de prueba',description:'Local DEMO',date:'2026-12-04',startsAt:'23:00',endsAt:'05:00',endsNextDay:true,endsOn:'2026-12-05',status:'published' as const};
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports:[CommonModule,ReactiveFormsModule,RouterTestingModule],declarations:[AdminEventProgressComponent,AdminEventFormComponent,AdminEventPreviewComponent,AdminEventTicketsComponent],providers:[AdminEventsService,{provide:ActivatedRoute,useValue:{snapshot:{paramMap:convertToParamMap({})},paramMap:of(convertToParamMap({}))}}]}).compileComponents();
    service=TestBed.inject(AdminEventsService);component=TestBed.createComponent(AdminEventFormComponent).componentInstance;
  });
  function fill():void {component.form.patchValue(valid);component.addTicket();component.form.controls.ticketTypes.at(0).patchValue({name:'General',priceClp:12000});}
  it('blocks invalid submissions and shows clear validation messages', () => {
    const save=spyOn(service,'save');component.submit();expect(save).not.toHaveBeenCalled();expect(component.error).toContain('Revisa');expect(component.form.controls.name.touched).toBeTrue();
  });
  it('requires tickets when publishing, validates prices and coherent overnight time', () => {
    component.form.patchValue(valid);expect(component.form.hasError('publishTickets')).toBeTrue();
    component.addTicket();const type=component.form.controls.ticketTypes.at(0);type.patchValue({name:'General',priceClp:-1});expect(component.form.invalid).toBeTrue();
    type.controls.priceClp.setValue(0);expect(component.form.valid).toBeTrue();
    component.form.controls.endsOn.setValue('2026-12-04');expect(component.form.hasError('schedule')).toBeTrue();
  });
  it('adds/removes types, prevents duplicates and enforces max purchase within capacity', () => {
    fill();component.addTicket();component.form.controls.ticketTypes.at(1).patchValue({name:'general'});expect(component.form.hasError('duplicateTickets')).toBeTrue();
    component.removeTicket(1);expect(component.form.controls.ticketTypes.length).toBe(1);
    component.form.controls.ticketTypes.at(0).patchValue({capacity:2,maxPerPurchase:3});expect(component.form.invalid).toBeTrue();
  });
  it('saves in memory and navigates to details only for a valid form', async () => {
    fill();const navigate=spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);component.submit();
    const records=await firstValueFrom(service.events$);expect(records.length).toBe(5);expect(records[4].name).toBe(valid.name);expect(navigate).toHaveBeenCalledWith(['/admin/eventos',records[4].id]);
  });
  it('loads existing data for editing and does not mutate service records before saving', async () => {
    const route={snapshot:{paramMap:convertToParamMap({id:'admin-demo-event-001'})},paramMap:of(convertToParamMap({id:'admin-demo-event-001'}))} as unknown as ActivatedRoute;
    const edit=new AdminEventFormComponent(service,route,TestBed.inject(Router));
    expect(edit.statusLabel).toBe('Publicado');expect(edit.form.controls.ticketTypes.length).toBe(2);edit.form.controls.name.setValue('Borrador sin guardar');
    expect((await firstValueFrom(service.events$))[0].name).toBe('VOID Sessions');
    spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);edit.submit();expect((await firstValueFrom(service.events$))[0].name).toBe('Borrador sin guardar');
  });
  it('refreshes when the router reuses the editor for another ID', () => {
    const params = new BehaviorSubject(convertToParamMap({id:'admin-demo-event-001'}));
    const route = {paramMap:params} as unknown as ActivatedRoute;
    const edit = new AdminEventFormComponent(service,route,TestBed.inject(Router));
    expect(edit.form.controls.name.value).toBe('VOID Sessions');
    params.next(convertToParamMap({id:'admin-demo-event-002'}));
    expect(edit.form.controls.name.value).toBe('VOID · After Hours');
    expect(edit.form.controls.ticketTypes.length).toBe(0);
    edit.ngOnDestroy();
  });
  it('renders a missing-record state for a lost event after reload', () => {
    const route={snapshot:{paramMap:convertToParamMap({id:'missing'})},paramMap:of(convertToParamMap({id:'missing'}))} as unknown as ActivatedRoute;
    expect(new AdminEventFormComponent(service,route,TestBed.inject(Router)).missing).toBeTrue();
  });
  it('gates each step and goes back without losing data',()=>{
    component.next();expect(component.step).toBe(0);
    component.form.controls.name.setValue('Mi evento');component.next();expect(component.step).toBe(1);
    component.next();expect(component.step).toBe(1);
    component.form.patchValue({date:'2026-12-04',endsOn:'2026-12-05'});component.next();expect(component.step).toBe(2);
    component.go(0);expect(component.form.controls.name.value).toBe('Mi evento');expect(component.form.controls.endsOn.value).toBe('2026-12-05');
  });
  it('does not bypass invalid information using the progress indicator',()=>{
    component.furthestStep=3;component.navigateStep(3);expect(component.step).toBe(0);
  });
  it('allows review without tickets but blocks publication and supports section editing',()=>{
    component.form.patchValue(valid);component.go(2);component.next();expect(component.step).toBe(3);expect(component.canPublish).toBeFalse();
    component.go(0);expect(component.form.controls.name.value).toBe(valid.name);component.go(1);expect(component.form.controls.date.value).toBe(valid.date);
  });
  it('saves an incomplete named draft without requiring publication fields',async()=>{
    spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);component.form.controls.name.setValue('Solo un nombre');component.saveDraft();
    const records=await firstValueFrom(service.events$);expect(records[4].status).toBe('draft');expect(records[4].date).toBe('');expect(records[4].ticketTypes.length).toBe(0);
  });
  it('keeps an entered end date when the starting date is changed',()=>{
    component.form.controls.date.setValue('2026-12-04');expect(component.form.controls.endsOn.value).toBe('2026-12-05');
    component.form.controls.endsOn.setValue('2026-12-06');component.form.controls.date.setValue('2026-12-05');expect(component.form.controls.endsOn.value).toBe('2026-12-06');
    component.form.controls.date.setValue('2026-12-07');expect(component.form.controls.endsOn.value).toBe('2026-12-06');expect(component.periodValid).toBeFalse();
  });
  it('shows a live preview of name, description and image',()=>{
    const fixture=TestBed.createComponent(AdminEventFormComponent);fixture.componentInstance.form.patchValue({name:'Vista previa',description:'Mi noche',image:'assets/events/void-dj.jpg'});fixture.detectChanges();
    const root=fixture.nativeElement as HTMLElement;expect(root.querySelector('app-admin-event-preview h3')?.textContent).toBe('Vista previa');expect(root.querySelector<HTMLImageElement>('app-admin-event-preview img')?.getAttribute('src')).toBe('assets/events/void-dj.jpg');
  });
  it('prompts before leaving edits, while cancellation keeps the original untouched',async()=>{
    const route={paramMap:of(convertToParamMap({id:'admin-demo-event-001'}))} as unknown as ActivatedRoute;
    const edit=new AdminEventFormComponent(service,route,TestBed.inject(Router));edit.form.controls.name.setValue('Sin guardar');
    const confirm=spyOn(window,'confirm').and.returnValue(false);expect(edit.confirmLeave()).toBeFalse();confirm.and.returnValue(true);expect(edit.confirmLeave()).toBeTrue();
    expect((await firstValueFrom(service.events$))[0].name).toBe('VOID Sessions');edit.ngOnDestroy();
  });
  it('guards browser reload only for unsaved changes',()=>{
    const event={preventDefault:jasmine.createSpy(),returnValue:undefined} as unknown as BeforeUnloadEvent;
    component.beforeUnload(event);expect(event.preventDefault).not.toHaveBeenCalled();component.form.controls.name.setValue('Pendiente');component.beforeUnload(event);expect(event.preventDefault).toHaveBeenCalled();
  });

  it('invalidates duplicate review confirmation after any schedule edit',()=>{
    const duplicate=service.duplicate('admin-demo-event-001');
    const route={paramMap:of(convertToParamMap({id:duplicate.id}))} as unknown as ActivatedRoute;
    const edit=new AdminEventFormComponent(service,route,TestBed.inject(Router));
    edit.form.controls.reviewedDate.setValue(true);expect(edit.copyDateValid).toBeFalse();
    edit.form.controls.date.setValue('2026-12-04');edit.form.controls.endsOn.setValue('2026-12-05');
    expect(edit.form.controls.reviewedDate.value).toBeFalse();edit.form.controls.reviewedDate.setValue(true);expect(edit.copyDateValid).toBeTrue();
    edit.form.controls.startsAt.setValue('22:00');expect(edit.form.controls.reviewedDate.value).toBeFalse();edit.ngOnDestroy();
  });

});
