import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { AdminEventsService } from './admin-events.service';
import { AdminEventFormComponent } from './admin-event-form.component';
import { AdminEventDraft } from './admin-event.model';

describe('AdminEventFormComponent', () => {
  let component: AdminEventFormComponent;
  let service: AdminEventsService;
  const valid = {name:'Evento de prueba',description:'Local DEMO',date:'2026-12-04',startsAt:'23:00',endsAt:'05:00',endsNextDay:true,status:'published' as const};
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports:[CommonModule,ReactiveFormsModule,RouterTestingModule],declarations:[AdminEventFormComponent],providers:[AdminEventsService,{provide:ActivatedRoute,useValue:{snapshot:{paramMap:convertToParamMap({})},paramMap:of(convertToParamMap({}))}}]}).compileComponents();
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
    component.form.controls.endsNextDay.setValue(false);expect(component.form.hasError('schedule')).toBeTrue();
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
    expect(edit.form.controls.ticketTypes.length).toBe(2);edit.form.controls.name.setValue('Borrador sin guardar');
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
});
