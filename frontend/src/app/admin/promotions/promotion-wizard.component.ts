import { Component, HostListener, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, CanDeactivateFn, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';
import { eventInstant } from '../events/admin-event-dates';
import { AdminPromotionsService } from './admin-promotions.service';
import { Promotion, PromotionDraft, PromotionModality, PromotionWizardPreview } from './promotion.model';
import { discount, PROMOTION_AUDIENCE, promotionStatus, scheduleLabel, validDuration } from './promotion.rules';
type Field=keyof PromotionWizardComponent['form']['controls'];
@Component({selector:'app-promotion-wizard',standalone:false,templateUrl:'./promotion-wizard.component.html',styleUrls:['./promotions.shared.scss','./promotion-wizard.scss']})
export class PromotionWizardComponent {
 readonly service=inject(AdminPromotionsService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);
 readonly steps=['Tipo','Producto','Precio','Horario','Notificación','Revisar'];step=0;furthestStep=0;id:string|undefined;missing=false;saving=false;error='';durationPreset='30';existing:Promotion|undefined;
 catalog:{id:string;name:string;priceClp:number;image:string}[]=[];capacities:{productId:string|null;name:string;possible:number}[]=[];
 private baseline='';private loading=true;private focusTimer:ReturnType<typeof setTimeout>|undefined;attempted=new Set<number>();
 readonly form=new FormGroup({name:new FormControl('',{nonNullable:true}),description:new FormControl('',{nonNullable:true}),modality:new FormControl<PromotionModality>('instant',{nonNullable:true}),productId:new FormControl('',{nonNullable:true}),referencePriceClp:new FormControl(0,{nonNullable:true}),promoPriceClp:new FormControl(0,{nonNullable:true}),durationMinutes:new FormControl(30,{nonNullable:true}),startDate:new FormControl('',{nonNullable:true}),startTime:new FormControl('',{nonNullable:true}),endDate:new FormControl('',{nonNullable:true}),endTime:new FormControl('',{nonNullable:true}),noticeTitle:new FormControl('',{nonNullable:true}),noticeMessage:new FormControl('',{nonNullable:true}),noticeAtStart:new FormControl(true,{nonNullable:true})});
 get modality(){return this.form.controls.modality.value;}
 get product(){return this.catalog.find(p=>p.id===this.form.controls.productId.value);}
 get capacity(){return this.capacities.find(c=>c.productId===this.form.controls.productId.value);}
 get published(){return this.existing?.mode==='scheduled';}
 get terminal(){return !!this.existing&&['cancelled','finished'].includes(promotionStatus(this.existing,this.service.now()));}
 get timingLocked(){return this.published&&(this.modality==='instant'||promotionStatus(this.existing!,this.service.now())==='active');}
 get percentage(){return discount(this.form.controls.referencePriceClp.value,this.form.controls.promoPriceClp.value);}
 get savings(){return Math.max(0,(this.form.controls.referencePriceClp.value||0)-(this.form.controls.promoPriceClp.value||0));}
 get finalLabel(){return this.published?'Guardar cambios':this.modality==='instant'?'Activar promoción ahora':'Programar promoción';}
 get preview():PromotionWizardPreview {const v=this.form.getRawValue();const from=this.timingLocked?this.existing?.startAt:eventInstant(v.startDate,v.startTime),to=this.timingLocked?this.existing?.endAt:eventInstant(v.endDate,v.endTime);return {name:v.name||'Tu promoción',title:v.noticeTitle||v.name,message:v.noticeMessage,productName:this.product?.name||'',image:this.product?.image||'',priceClp:v.promoPriceClp>0?v.promoPriceClp:null,normalPrice:v.referencePriceClp,discount:this.percentage,audience:PROMOTION_AUDIENCE,statusLabel:this.published?'Guardada en la ':'Borrador · Vista previa',schedule:this.modality==='instant'&&!this.published?`${v.durationMinutes||'Duración pendiente'} min · Se activará al publicar`:from!=null&&to!=null?scheduleLabel(from,to):'Fechas pendientes · America/Santiago',timingNote:v.noticeAtStart?(this.modality==='instant'?'Se preparará al activar':'Programada para el inicio'):'Sin aviso al inicio'};}
 constructor(){
  this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params=>{this.loading=true;this.id=params.get('id')||undefined;this.existing=undefined;this.missing=false;this.error='';this.step=0;this.furthestStep=0;this.attempted.clear();
   this.form.reset({name:'',description:'',modality:'instant',productId:'',referencePriceClp:0,promoPriceClp:0,durationMinutes:30,startDate:'',startTime:'',endDate:'',endTime:'',noticeTitle:'',noticeMessage:'',noticeAtStart:true},{emitEvent:false});
   this.service.view$.pipe(take(1)).subscribe(vm=>{this.catalog=vm.catalog;this.capacities=vm.capacities;if(this.id){const p=vm.promotions.find(v=>v.id===this.id);this.missing=!p;if(p){this.existing=p;this.form.patchValue({...p,modality:p.modality,durationMinutes:p.durationMinutes??30},{emitEvent:false});this.form.controls.noticeTitle.markAsDirty();this.form.controls.noticeMessage.markAsDirty();if(p.mode==='draft'){const progress=this.service.getDraftProgress(p.id);this.step=progress.step;this.furthestStep=progress.furthest;}else{this.furthestStep=5;this.step=this.terminal?5:0;}}}
    this.durationPreset=[15,30,60].includes(this.form.controls.durationMinutes.value)?String(this.form.controls.durationMinutes.value):'custom';this.loading=false;this.capture();
   });
  });
  this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(()=>{if(!this.loading){this.error='';this.autoNotice();}});
 }
 ngOnDestroy(){if(this.focusTimer)clearTimeout(this.focusTimer);}
 trackProduct(_:number,p:{id:string}){return p.id;}
 changeModality(modality:PromotionModality){if(modality===this.modality||this.published||this.terminal)return;if(this.furthestStep>0&&!window.confirm('Cambiar la modalidad descarta solo las fechas o duración incompatibles. Producto, precio y mensaje se conservan. ¿Continuar?'))return;this.form.patchValue({modality,startDate:'',startTime:'',endDate:'',endTime:'',durationMinutes:modality==='instant'?30:0},{emitEvent:false});this.durationPreset='30';this.error='';}
 modalityKey(event:KeyboardEvent){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();this.changeModality(this.modality==='instant'?'scheduled':'instant');document.getElementById('promo-type-'+this.modality)?.focus();}}
 selectProduct(id:string){const old=this.product,p=this.catalog.find(v=>v.id===id);if(!p||this.terminal)return;const name=this.form.controls.name.value;if(!name||name===`${old?.name} Flash`)this.form.controls.name.setValue(`${p.name} Flash`,{emitEvent:false});this.form.patchValue({productId:p.id,referencePriceClp:p.priceClp,promoPriceClp:this.form.controls.promoPriceClp.value||Math.max(1,Math.round(p.priceClp*.6))},{emitEvent:false});this.autoNotice();}
 duration(value:string){if(this.timingLocked)return;this.durationPreset=value;if(value!=='custom')this.form.controls.durationMinutes.setValue(Number(value));}
 private autoNotice(){const p=this.product;if(!p)return;const title=this.form.controls.noticeTitle,message=this.form.controls.noticeMessage;if(!title.dirty)title.setValue(`¡${p.name} Flash en VOID!`,{emitEvent:false});if(!message.dirty){const price=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(this.form.controls.promoPriceClp.value||0);message.setValue(`${p.name} a ${price}${this.modality==='instant'?` durante ${this.form.controls.durationMinutes.value||0} minutos`:' en el horario indicado'}`,{emitEvent:false});}}
 stepErrors(index:number):Partial<Record<Field,string>>{
  const v=this.form.getRawValue(),errors:Partial<Record<Field,string>>={};
  if(index===0){if(!['instant','scheduled'].includes(v.modality))errors.modality='Selecciona una modalidad.';if(v.name.trim().length>80||(!v.name.trim()&&!!v.productId))errors.name='Indica un nombre de 1 a 80 caracteres.';if(v.description.length>300)errors.description='Máximo 300 caracteres.';}
  if(index===1&&!this.product)errors.productId='Selecciona un trago del catálogo .';
  if(index===2){if(!Number.isSafeInteger(v.referencePriceClp)||v.referencePriceClp<=0||v.referencePriceClp>10000000)errors.referencePriceClp='La referencia debe ser un entero positivo.';if(!Number.isSafeInteger(v.promoPriceClp)||v.promoPriceClp<=0||v.promoPriceClp>=v.referencePriceClp)errors.promoPriceClp='Usa un precio entero positivo inferior a la referencia.';}
  if(index===3&&!this.timingLocked){if(v.modality==='instant'){if(!validDuration(v.durationMinutes))errors.durationMinutes='Indica entre 1 y 1.440 minutos enteros.';}else{const from=eventInstant(v.startDate,v.startTime),to=eventInstant(v.endDate,v.endTime);if(from===null){errors.startDate='Revisa la fecha y hora de inicio en Santiago.';errors.startTime='La hora debe existir y no ser ambigua.';}if(to===null){errors.endDate='Revisa la fecha y hora de término.';errors.endTime='La hora debe existir y no ser ambigua.';}if(from!==null&&to!==null&&to<=from)errors.endDate='El término debe ser posterior; al cruzar medianoche usa el día siguiente.';if(from!==null&&from<=this.service.now())errors.startDate='Para programar, el inicio debe ser futuro.';}}
  if(index===4){if(v.noticeTitle.length>80||(v.noticeAtStart&&!v.noticeTitle.trim()))errors.noticeTitle='Indica un título de hasta 80 caracteres.';if(v.noticeMessage.length>240||(v.noticeAtStart&&!v.noticeMessage.trim()))errors.noticeMessage='Indica un mensaje de hasta 240 caracteres.';}
  return errors;
 }
 fieldError(field:Field){return this.attempted.has(this.step)?this.stepErrors(this.step)[field]||'':'';}
 get completion(){return this.steps.map((_,i)=>i===5?[0,1,2,3,4].every(n=>!Object.keys(this.stepErrors(n)).length):!Object.keys(this.stepErrors(i)).length);}
 next(){if(this.terminal||this.saving)return;this.attempted.add(this.step);const errors=this.stepErrors(this.step),first=Object.keys(errors)[0] as Field|undefined;if(first){this.error='Revisa los campos indicados antes de continuar.';this.focusField(first);return;}this.go(this.step+1);}
 navigateStep(index:number){if(index<=this.step){this.go(index);return;}while(this.step<index){const before=this.step;this.next();if(this.step===before)break;}}
 go(index:number){this.step=Math.max(0,Math.min(5,index));this.furthestStep=Math.max(this.furthestStep,this.step);this.error='';this.focus('promo-wizard-heading');}
 private focusField(field:Field){this.focus(field==='modality'?'promo-type-instant':field==='productId'?'promo-product-first':`promo-${field}`);}
 private focus(id:string){if(this.focusTimer)clearTimeout(this.focusTimer);this.focusTimer=setTimeout(()=>document.getElementById(id)?.focus(),0);}
 private payload(mode:'draft'|'scheduled'):PromotionDraft {const v=this.form.getRawValue();return {...v,referencePriceClp:v.referencePriceClp??0,promoPriceClp:v.promoPriceClp??0,durationMinutes:v.durationMinutes??0,mode,audience:PROMOTION_AUDIENCE};}
 publish(){if(this.terminal||this.saving)return;for(let i=0;i<5;i++){this.attempted.add(i);const first=Object.keys(this.stepErrors(i))[0] as Field|undefined;if(first){this.step=i;this.furthestStep=Math.max(this.furthestStep,i);this.error='Revisa este paso antes de publicar .';this.focusField(first);return;}}this.persist(false);}
 saveDraft(){if(this.published||this.terminal||this.saving)return;if(!this.form.controls.name.value.trim()){this.step=0;this.attempted.add(0);this.error='Escribe un nombre para recuperar tu borrador durante esta sesión.';this.focusField('name');return;}this.persist(true);}
 private persist(draft:boolean){this.error='';this.saving=true;const action=draft?this.service.saveWizardDraft(this.payload('draft'),this.id,{step:this.step,furthest:this.furthestStep}):this.service.savePromotion(this.payload('scheduled'),this.id);action.subscribe({next:id=>{this.id=id;this.capture();void this.router.navigate(['/admin/promociones']).finally(()=>this.saving=false);},error:e=>{this.error=e.message;this.saving=false;}});}
 signature(){return JSON.stringify(this.form.getRawValue());}private capture(){this.baseline=this.signature();}
 confirmLeave(){return this.missing||this.terminal||this.signature()===this.baseline||window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?');}
 @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent){if(!this.missing&&!this.terminal&&this.signature()!==this.baseline){event.preventDefault();event.returnValue='';}}
}
export const promotionWizardUnsavedGuard:CanDeactivateFn<PromotionWizardComponent>=component=>component.confirmLeave();
