import { Component, HostListener, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, CanDeactivateFn, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, take } from 'rxjs';
import { eventInstant } from '../events/admin-event-dates';
import { AdminPromotionsService } from './admin-promotions.service';
import { AudienceId, NoticeDraft, NoticeKind, NoticePreview, NOTICE_KINDS, PromotionDraft } from './promotion.model';
import { AUDIENCES, audiencePlan, discount, isClient, localFields, scheduleLabel } from './promotion.rules';
const requiredText=(c:AbstractControl)=>typeof c.value==='string'&&c.value.trim()?null:{required:true};
@Component({selector:'app-admin-promotion-form',standalone:false,templateUrl:'./admin-promotion-form.component.html',styleUrls:['./promotions.shared.scss','./promotion-form.scss']})
export class AdminPromotionFormComponent {
 readonly service=inject(AdminPromotionsService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);
 readonly audiences=AUDIENCES.filter(a=>!isClient(a.value));readonly kinds=NOTICE_KINDS;readonly audiencePlan=audiencePlan;
 mode='promotion';id:string|undefined;missing=false;readonlyRecord=false;saving=false;error='';private baseline='';
 catalog:{id:string;name:string;priceClp:number}[]=[];
 readonly promotion=new FormGroup({name:new FormControl('',{nonNullable:true,validators:[requiredText,Validators.maxLength(80)]}),description:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(300)]}),productId:new FormControl('',{nonNullable:true,validators:[Validators.required]}),referencePriceClp:new FormControl(0,{nonNullable:true}),promoPriceClp:new FormControl(0,{nonNullable:true}),mode:new FormControl<'draft'|'scheduled'>('draft',{nonNullable:true}),startDate:new FormControl('',{nonNullable:true,validators:[Validators.required]}),startTime:new FormControl('',{nonNullable:true,validators:[Validators.required]}),endDate:new FormControl('',{nonNullable:true,validators:[Validators.required]}),endTime:new FormControl('',{nonNullable:true,validators:[Validators.required]}),audience:new FormControl<AudienceId>('clients-consented',{nonNullable:true}),noticeTitle:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(80)]}),noticeMessage:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(240)]}),noticeAtStart:new FormControl(false,{nonNullable:true})});
 readonly notification=new FormGroup({title:new FormControl('',{nonNullable:true,validators:[requiredText,Validators.maxLength(80)]}),message:new FormControl('',{nonNullable:true,validators:[requiredText,Validators.maxLength(240)]}),kind:new FormControl<NoticeKind>('promotion',{nonNullable:true}),audience:new FormControl<AudienceId>('clients-consented',{nonNullable:true}),date:new FormControl('',{nonNullable:true,validators:[Validators.required]}),time:new FormControl('',{nonNullable:true,validators:[Validators.required]}),mode:new FormControl<'draft'|'scheduled'>('draft',{nonNullable:true}),productId:new FormControl('',{nonNullable:true}),ingredientId:new FormControl('',{nonNullable:true})});
 get form():FormGroup{return this.mode==='promotion'?this.promotion:this.notification;}
 get commercialNotice(){return this.kinds.find(k=>k.value===this.notification.controls.kind.value)?.commercial===true;}
 get title(){return this.mode==='promotion'?(this.id?'Editar promoción':'Nueva promoción'):(this.id?'Editar aviso ':'Nuevo aviso ');}
 get percentage(){const p=this.promotion.getRawValue();return discount(p.referencePriceClp,p.promoPriceClp);}
 get preview():NoticePreview {
  if(this.mode==='promotion'){const p=this.promotion.getRawValue(),from=eventInstant(p.startDate,p.startTime),to=eventInstant(p.endDate,p.endTime);return {title:p.noticeTitle||p.name,message:p.noticeMessage||p.description,productName:this.catalog.find(c=>c.id===p.productId)?.name||'',priceClp:p.promoPriceClp>0?p.promoPriceClp:null,schedule:from!==null&&to!==null?scheduleLabel(from,to):'Programación pendiente · America/Santiago',audience:p.audience};}
  const n=this.notification.getRawValue(),at=eventInstant(n.date,n.time);return {title:n.title,message:n.message,productName:this.catalog.find(c=>c.id===n.productId)?.name||'',priceClp:null,schedule:at!==null?scheduleLabel(at):'Programación pendiente · America/Santiago',audience:n.audience};
 }
 constructor(){combineLatest([this.route.paramMap,this.route.data,this.route.queryParamMap]).pipe(takeUntilDestroyed()).subscribe(([params,data,query])=>{
  this.mode=data['mode'];this.id=params.get('id')||undefined;this.missing=false;this.readonlyRecord=false;this.error='';
  this.service.view$.pipe(take(1)).subscribe(vm=>{this.catalog=vm.catalog;const today=localFields(vm.now),later=localFields(vm.now+3600000);
   this.promotion.reset({name:'',description:'',productId:'',referencePriceClp:0,promoPriceClp:0,mode:'draft',startDate:today.date,startTime:today.time,endDate:later.date,endTime:later.time,audience:'clients-consented',noticeTitle:'',noticeMessage:'',noticeAtStart:false});
   this.notification.reset({title:'',message:'',kind:'promotion',audience:'clients-consented',date:today.date,time:today.time,mode:'draft',productId:'',ingredientId:''});
   if(this.mode==='promotion'&&this.id){const p=vm.promotions.find(p=>p.id===this.id);this.missing=!p;if(p){this.promotion.patchValue({...p,mode:p.mode==='cancelled'?'draft':p.mode});this.readonlyRecord=p.mode==='cancelled';}}
   if(this.mode==='notice'&&this.id){const n=vm.notices.find(n=>n.id===this.id);this.missing=!n;if(n){this.notification.patchValue({...n,mode:n.state==='draft'?'draft':'scheduled',productId:n.productId||'',ingredientId:n.ingredientId||''});this.readonlyRecord=!!n.promotionId||n.state==='cancelled'||n.state==='simulated';}}
   if(this.mode==='notice'&&!this.id&&query.get('ingredient')){const alert=vm.stockAlerts.find(a=>a.id===query.get('ingredient'));if(alert)this.notification.patchValue({title:`Revisar ${alert.label}`.slice(0,80),message:`Consulta DEMO: ${alert.stock} unidades disponibles; mínimo ${alert.minimum}. Revisar ${alert.label}. Sin movimientos ni reservas.`,kind:'stock',audience:'bar',ingredientId:alert.id});else this.error='La referencia ya no aparece como alerta. Puedes preparar un aviso independiente.';}
   this.capture();
  });
 });}
 selectProduct(){const p=this.catalog.find(c=>c.id===this.promotion.controls.productId.value);if(p){this.promotion.controls.referencePriceClp.setValue(p.priceClp);if(!this.promotion.controls.promoPriceClp.value)this.promotion.controls.promoPriceClp.setValue(Math.max(1,Math.round(p.priceClp*.6)));}}
 kindChanged(){const kind=this.kinds.find(k=>k.value===this.notification.controls.kind.value);if(kind)this.notification.controls.audience.setValue(kind.commercial?'clients-consented':kind.value==='door'?'door':kind.value==='supervisor'?'supervisor':'bar');}
 save(){if(this.saving||this.missing||this.readonlyRecord)return;this.form.markAllAsTouched();this.error='';if(this.form.invalid){this.error='Revisa los campos obligatorios y los límites antes de guardar.';return;}this.saving=true;
  const action=this.mode==='promotion'?this.service.savePromotion(this.promotion.getRawValue(),this.id):this.service.saveNotice(this.noticeDraft(),this.id);
  action.subscribe({next:id=>{this.id=id;this.capture();void this.router.navigate(['/admin/promociones'],{queryParams:{view:this.mode==='promotion'?'promotions':'notifications'}}).finally(()=>this.saving=false);},error:e=>{this.error=e.message;this.saving=false;}});
 }
 noticeDraft():NoticeDraft{const n=this.notification.getRawValue();return {...n,productId:n.productId||null,ingredientId:n.ingredientId||null};}
 signature(){return JSON.stringify(this.form.getRawValue());}private capture(){this.baseline=this.signature();}
 confirmLeave(){return this.missing||this.readonlyRecord||this.signature()===this.baseline||window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?');}
 @HostListener('window:beforeunload',['$event']) unload(e:BeforeUnloadEvent){if(!this.missing&&!this.readonlyRecord&&this.signature()!==this.baseline){e.preventDefault();e.returnValue='';}}
}
export const promotionUnsavedGuard:CanDeactivateFn<AdminPromotionFormComponent>=component=>component.confirmLeave();
