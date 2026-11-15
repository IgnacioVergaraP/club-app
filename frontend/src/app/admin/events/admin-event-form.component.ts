import { Component, HostListener, OnDestroy } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { merge, Subject, take, takeUntil } from 'rxjs';
import { readEventImage } from './admin-event-image';
import { AdminEventsService } from './admin-events.service';
import { AdminEventDraft, AdminTicketType, EVENT_IMAGES, EVENT_LIMITS, EVENT_STATUSES } from './admin-event.model';
import { eventDateValidator, eventFormValidator, requiredTrimmed } from './admin-event.validation';
import { createTicketForm } from './admin-event-ticket-form';
import { eventEndDate, eventScheduleSummary, formatEventDay, nextEventDay, validEventPeriod } from './admin-event-dates';

@Component({selector:'app-admin-event-form',standalone:false,templateUrl:'./admin-event-form.component.html',styleUrls:['./admin-event-form.component.scss']})
export class AdminEventFormComponent implements OnDestroy {
  readonly limits=EVENT_LIMITS;
  imageLoading=false; imageError=''; private imageRequest=0;
  readonly steps=['Información del evento','Fecha y horario','Entradas','Revisar y publicar'];
  step=0; furthestStep=0; id?:string; missing=false; error=''; saving=false;
  requiresDateReview=false; originalSchedule=''; private savedValue='';
  private readonly destroyed$=new Subject<void>();
  readonly form=new FormGroup({
    name:new FormControl('',{nonNullable:true,validators:[requiredTrimmed,Validators.maxLength(EVENT_LIMITS.name)]}),
    description:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(EVENT_LIMITS.description)]}),
    date:new FormControl('',{nonNullable:true,validators:[eventDateValidator]}),
    startsAt:new FormControl('23:00',{nonNullable:true,validators:[Validators.required]}),
    endsAt:new FormControl('05:00',{nonNullable:true,validators:[Validators.required]}),
    endsOn:new FormControl('',{nonNullable:true,validators:[eventDateValidator]}),
    endsNextDay:new FormControl(true,{nonNullable:true}),
    image:new FormControl<string>(EVENT_IMAGES[0].value,{nonNullable:true,validators:[Validators.required]}),
    status:new FormControl<AdminEventDraft['status']>('draft',{nonNullable:true}),
    reviewedDate:new FormControl(false,{nonNullable:true}),
    ticketTypes:new FormArray<ReturnType<typeof createTicketForm>>([])
  },{validators:[eventFormValidator]});
  constructor(private readonly service:AdminEventsService,private readonly route:ActivatedRoute,private readonly router:Router){
    this.route.paramMap.pipe(takeUntil(this.destroyed$)).subscribe(params=>{
      this.imageRequest++;this.imageLoading=false;this.imageError='';
      this.id=params.get('id')||undefined;this.missing=false;this.error='';this.step=0;this.furthestStep=0;this.requiresDateReview=false;this.originalSchedule='';
      this.form.controls.ticketTypes.clear();
      this.form.reset({name:'',description:'',date:'',startsAt:'23:00',endsAt:'05:00',endsOn:'',endsNextDay:true,image:EVENT_IMAGES[0].value,status:'draft',reviewedDate:false},{emitEvent:false});
      if(this.id)this.service.events$.pipe(take(1)).subscribe(events=>{
        const event=events.find(item=>item.id===this.id);if(!event){this.missing=true;return;}
        this.form.patchValue({...event,endsOn:eventEndDate(event)},{emitEvent:false});
        event.ticketTypes.forEach(type=>this.form.controls.ticketTypes.push(createTicketForm(type),{emitEvent:false}));
        this.requiresDateReview=!!event.requiresDateReview;this.originalSchedule=event.duplicatedSchedule||'';
      });
      this.form.updateValueAndValidity({emitEvent:false});this.form.markAsPristine();this.savedValue=this.signature();
    });
    this.form.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe(()=>this.error='');
    this.form.controls.date.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe(date=>{
      if(this.requiresDateReview)this.form.controls.reviewedDate.setValue(false,{emitEvent:false});
      // Solo completar un término vacío. Nunca sobrescribir una fecha ya ingresada.
      if(!this.form.controls.endsOn.value){const day=this.form.controls.endsAt.value<=this.form.controls.startsAt.value?nextEventDay(date):date;this.form.controls.endsOn.setValue(day);}
    });
    merge(this.form.controls.endsOn.valueChanges,this.form.controls.startsAt.valueChanges,this.form.controls.endsAt.valueChanges).pipe(takeUntil(this.destroyed$)).subscribe(()=>{if(this.requiresDateReview)this.form.controls.reviewedDate.setValue(false,{emitEvent:false});});
  }
  ngOnDestroy():void{this.imageRequest++;this.destroyed$.next();this.destroyed$.complete();}
  async onImageSelected(event:Event):Promise<void>{
    const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;
    const request=++this.imageRequest;this.imageLoading=true;this.imageError='';
    try{const image=await readEventImage(file);if(request!==this.imageRequest)return;this.form.controls.image.setValue(image);this.form.controls.image.markAsDirty();}
    catch(error){input.value='';if(request===this.imageRequest)this.imageError=(error as Error).message+' Se conserva la imagen anterior.';}
    finally{if(request===this.imageRequest)this.imageLoading=false;}
  }
  ticketGroup(type?:AdminTicketType){return createTicketForm(type);}
  addTicket():void{if(this.form.controls.ticketTypes.length<EVENT_LIMITS.ticketTypes)this.form.controls.ticketTypes.push(createTicketForm());}
  removeTicket(index:number):void{this.form.controls.ticketTypes.removeAt(index);}
  get statusLabel():string{return EVENT_STATUSES.find(state=>state.value===this.form.controls.status.value)?.label || 'Borrador';}
  get canSaveDraft():boolean{return this.form.controls.name.valid&&!this.missing&&!this.saving&&!this.imageLoading;}
  get infoValid():boolean{return !this.imageLoading&&['name','description','image'].every(key=>this.form.get(key)!.valid);}
  get periodValid():boolean {const value=this.form.getRawValue();return validEventPeriod(value.date,value.startsAt,value.endsOn,value.endsAt);}
  get copyDateValid():boolean{return !this.requiresDateReview||(this.form.controls.reviewedDate.value&&this.form.controls.date.value!==this.originalSchedule.split('|')[0]);}
  get ticketsValid():boolean{return this.form.controls.ticketTypes.length>0&&this.form.controls.ticketTypes.valid&&!this.form.hasError('duplicateTickets');}
  get canPublish():boolean{return this.infoValid&&this.periodValid&&this.copyDateValid&&this.ticketsValid&&!this.missing&&!this.saving;}
  get schedule():string{const v=this.form.getRawValue();return eventScheduleSummary(v.date,v.startsAt,v.endsOn,v.endsAt);}
  get dateRange():string{return `${formatEventDay(this.form.controls.date.value)} → ${formatEventDay(this.form.controls.endsOn.value)}`;}
  get hasUnsavedChanges():boolean{return !this.missing&&this.signature()!==this.savedValue;}
  invalid(control:FormControl):boolean{return control.invalid&&control.touched;}
  get stepCompletion():boolean[]{return this.steps.map((_,index)=>this.complete(index));}
  complete(index:number):boolean{return index===0?this.infoValid:index===1?this.periodValid&&this.copyDateValid:index===2?this.ticketsValid:this.canPublish;}
  next():void {
    this.error='';
    if(this.step===0&&!this.infoValid){['name','description','image'].forEach(key=>this.form.get(key)!.markAsTouched());this.error='Completa la información requerida para continuar.';return;}
    if(this.step===1&&(!this.periodValid||!this.copyDateValid)){['date','endsOn','startsAt','endsAt','reviewedDate'].forEach(key=>this.form.get(key)!.markAsTouched());this.error='Revisa el inicio y término en America/Santiago y confirma la fecha de la copia si corresponde.';return;}
    if(this.step===2&&this.form.controls.ticketTypes.length&&!this.ticketsValid){this.form.controls.ticketTypes.markAllAsTouched();this.error='Revisa las entradas antes de continuar.';return;}
    this.go(this.step+1);
  }
  navigateStep(index:number):void{if(index<=this.step){this.go(index);return;}while(this.step<index){const before=this.step;this.next();if(this.step===before)break;}}
  go(index:number):void{this.step=Math.max(0,Math.min(3,index));this.furthestStep=Math.max(this.furthestStep,this.step);this.error='';setTimeout(()=>document.getElementById('wizard-step-heading')?.focus());}
  saveDraft():void{if(!this.canSaveDraft){this.form.controls.name.markAsTouched();this.error='Escribe un nombre para identificar y recuperar tu borrador.';return;}this.persist('draft');}
  submit():void{this.publish();}
  publish():void{this.form.markAllAsTouched();if(!this.canPublish){this.error='Revisa la información, programación y entradas antes de publicar DEMO.';return;}this.persist('published');}
  private persist(status:AdminEventDraft['status']):void {
    try{this.saving=true;const saved=this.service.save({...this.draft(),status},this.id,this.form.controls.reviewedDate.value);this.id=saved.id;this.form.controls.status.setValue(status);this.savedValue=this.signature();void this.router.navigate(['/admin/eventos',saved.id]).finally(()=>this.saving=false);}
    catch(error){this.saving=false;this.error=(error as Error).message;}
  }
  private draft():AdminEventDraft{const v=this.form.getRawValue();return {...v,endsNextDay:v.endsOn===nextEventDay(v.date)};}
  private signature():string{return JSON.stringify(this.form.getRawValue());}
  confirmLeave():boolean{return !this.hasUnsavedChanges||window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?');}
  @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent):void{if(this.hasUnsavedChanges){event.preventDefault();event.returnValue='';}}
}
