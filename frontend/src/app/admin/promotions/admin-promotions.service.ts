import { Injectable, InjectionToken, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, fromEvent, map, merge, startWith, take, timer } from 'rxjs';
import { AdminDrinksService } from '../drinks/admin-drinks.service';
import { ADMIN_DEMO_DRINKS } from '../drinks/admin-drinks.data';
import { AdminInventoryService } from '../inventory/admin-inventory.service';
import { initialPromotions } from './promotion.data';
import { AudienceId, DemoNotice, NoticeDraft, Promotion, PromotionData, PromotionDraft, PromotionDraftProgress, PromotionHistory } from './promotion.model';
import { discount, localFields, noticeDue, promotionStatus, promotionSummary, validateNotice, validatePromotion } from './promotion.rules';
export const PROMOTIONS_CLOCK=new InjectionToken<()=>number>('Promotions clock',{providedIn:'root',factory:()=>()=>Date.now()});
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
@Injectable()
export class AdminPromotionsService {
 private readonly clock=inject(PROMOTIONS_CLOCK);private readonly catalog=inject(AdminDrinksService);private readonly inventory=inject(AdminInventoryService);
 private readonly state=new BehaviorSubject<PromotionData>(initialPromotions(this.clock(),ADMIN_DEMO_DRINKS));
 private readonly draftProgress=new Map<string,PromotionDraftProgress>();
 private readonly notice=new BehaviorSubject('');readonly message$=this.notice.asObservable();
 readonly view$=combineLatest([this.state,this.catalog.drinks$,this.inventory.view$,merge(timer(1000,1000),fromEvent(window,'focus'),fromEvent(document,'visibilitychange')).pipe(startWith(0))]).pipe(map(([state,drinks,inventory])=>{
  const data=copy(state),now=this.clock();return {...data,now,summary:promotionSummary(data.promotions,now),promotions:data.promotions.map(p=>({...p,status:promotionStatus(p,now),discount:discount(p.referencePriceClp,p.promoPriceClp)})),notices:data.notices.map(n=>({...n,due:noticeDue(n,now)})),catalog:drinks.map(d=>({id:d.id,name:d.name,priceClp:d.priceClp,image:d.image})),capacities:inventory.recipes.map(r=>({productId:r.drinkId,name:r.name,possible:r.capacity.possible})),stockAlerts:inventory.rows.filter(r=>r.status!=='available').map(r=>({id:r.id,label:r.label,stock:r.stock,minimum:r.minimum,status:r.status}))};
 }));
 now(){return this.clock();}
 getDraftProgress(id:string){const value=this.draftProgress.get(id);return value?{...value}:{step:0,furthest:0};}
 savePromotion(draft:PromotionDraft,id?:string){return this.persistPromotion(draft,id,false);}
 saveWizardDraft(draft:PromotionDraft,id?:string,progress:PromotionDraftProgress={step:0,furthest:0}){return this.persistPromotion({...draft,mode:'draft'},id,true).pipe(map(saved=>{this.draftProgress.set(saved,{step:Math.max(0,Math.min(5,progress.step)),furthest:Math.max(0,Math.min(5,progress.furthest))});return saved;}));}
 private persistPromotion(draft:PromotionDraft,id:string|undefined,incomplete:boolean){return this.catalog.drinks$.pipe(take(1),map(drinks=>{
  const now=this.clock(),data=copy(this.state.value),old=id?data.promotions.find(p=>p.id===id):undefined;
  if(id&&!old)throw Error('La promoción no existe en esta sesión DEMO.');
  if(old&&(promotionStatus(old,now)==='cancelled'||promotionStatus(old,now)==='finished'))throw Error('Una promoción cancelada o finalizada no puede reactivarse. Duplica el escenario para otra prueba.');
  const modality=draft.modality||'scheduled';
  if(old?.mode==='scheduled'&&(draft.mode!=='scheduled'||modality!==old.modality))throw Error('La modalidad y el estado publicado se conservan; duplica para otro escenario.');
  if(incomplete&&old?.mode==='scheduled')throw Error('Una promoción publicada no se convierte de nuevo en borrador.');
  if(old?.mode==='scheduled'&&modality==='instant'&&draft.durationMinutes!==old.durationMinutes)throw Error('La duración de una promoción activada no puede reiniciarse al editar.');
  const dates=validatePromotion(draft,drinks.map(d=>d.id),{now,incompleteDraft:incomplete,existing:old});
  if(!incomplete&&draft.mode==='scheduled'&&modality==='scheduled'){
   if((!old||old.mode==='draft'||promotionStatus(old,now)==='scheduled')&&dates.startAt!<=now)throw Error('Para programar, el inicio debe ser futuro en America/Santiago.');
   if(old&&promotionStatus(old,now)==='active'&&(dates.startAt!==old.startAt||dates.endAt!==old.endAt))throw Error('El horario de una promoción activa no puede modificarse retroactivamente.');
  }
  const product=drinks.find(d=>d.id===draft.productId);
  const localStart=modality==='instant'?(dates.startAt!==null?localFields(dates.startAt):{date:'',time:''}):{date:draft.startDate,time:draft.startTime};
  const localEnd=modality==='instant'?(dates.endAt!==null?localFields(dates.endAt):{date:'',time:''}):{date:draft.endDate,time:draft.endTime};
  const p:Promotion={...draft,name:draft.name.trim(),description:draft.description.trim(),noticeTitle:draft.noticeTitle.trim(),noticeMessage:draft.noticeMessage.trim(),...dates,modality,durationMinutes:modality==='instant'?(draft.durationMinutes??0):null,activatedAt:modality==='instant'&&draft.mode==='scheduled'?(old?.activatedAt??now):null,startDate:localStart.date,startTime:localStart.time,endDate:localEnd.date,endTime:localEnd.time,id:id||`DEMO-PRO-${data.promotions.length+1}`,productName:product?.name||'',isDemo:true};
  data.promotions=old?data.promotions.map(v=>v.id===id?p:v):[...data.promotions,p];this.log(data,p.id,'promotion',incomplete?'Borrador guardado':old?'Editada':modality==='instant'?'Activada DEMO':'Creada',p.audience,promotionStatus(p,now),`${p.name}. Solo simulación; precio del catálogo sin cambios.`);
  if(!incomplete)this.syncPlannedNotice(data,p);this.state.next(data);if(p.mode!=='draft')this.draftProgress.delete(p.id);
  this.notice.next(`${p.name}: ${incomplete?'borrador guardado':p.modality==='instant'?'estado local guardado':'promoción guardada'} · DEMO sin publicar comercialmente ni enviar avisos.`);return p.id;
 }));}
 duplicate(id:string){const old=this.state.value.promotions.find(p=>p.id===id);if(!old)throw Error('Promoción no encontrada.');return this.saveWizardDraft({...copy(old),name:old.name.slice(0,72)+' (copia)',mode:'draft',noticeAtStart:false}).pipe(map(newId=>{const data=copy(this.state.value),p=data.promotions.find(p=>p.id===newId)!;this.log(data,newId,'promotion','Duplicada',p.audience,'draft',`Copia independiente de ${id}, sin identidad o publicación heredada.`);this.state.next(data);return newId;}));}
 cancelPromotion(id:string){const data=copy(this.state.value),p=data.promotions.find(p=>p.id===id);if(!p)throw Error('Promoción no encontrada.');if(p.mode==='cancelled')return;p.mode='cancelled';this.log(data,p.id,'promotion','Cancelada',p.audience,'cancelled',`${p.name}: cancelación DEMO permanente para este registro.`);const linked=data.notices.find(n=>n.promotionId===p.id);if(linked&&(linked.state==='draft'||linked.state==='scheduled')){linked.state='cancelled';this.log(data,linked.id,'notification','Cancelada',linked.audience,'cancelled','Aviso cancelado junto a su promoción; no hubo envío.');}this.state.next(data);this.notice.next('Promoción y aviso pendiente cancelados en la DEMO.');}
 saveNotice(draft:NoticeDraft,id?:string){return combineLatest([this.catalog.drinks$,this.inventory.view$]).pipe(take(1),map(([drinks,inventory])=>{
  const at=validateNotice(draft,drinks.map(d=>d.id),inventory.rows.map(r=>r.id)),data=copy(this.state.value),old=id?data.notices.find(n=>n.id===id):undefined;
  if(id&&!old)throw Error('Aviso no encontrado en esta sesión.');if(old&&(old.promotionId||old.state==='cancelled'||old.state==='simulated'))throw Error('Este aviso no es editable aquí. Los vinculados se editan desde su promoción; los finalizados/cancelados se conservan.');
  const {mode,...payload}=draft;const n:DemoNotice={...payload,title:draft.title.trim(),message:draft.message.trim(),id:id||`DEMO-NOT-${data.notices.length+1}`,state:draft.mode,scheduledAt:at,productName:drinks.find(d=>d.id===draft.productId)?.name||'',promotionId:null,offer:null,isDemo:true};
  data.notices=old?data.notices.map(v=>v.id===id?n:v):[...data.notices,n];this.log(data,n.id,'notification',old?'Editada':'Creada',n.audience,n.state,'Mensaje DEMO preparado; sin envío ni destinatarios reales.');this.state.next(data);this.notice.next(`${n.title}: aviso ${n.state==='draft'?'en borrador':'programado de forma ficticia'}. No se envió.`);return n.id;
 }));}
 cancelNotice(id:string){const data=copy(this.state.value),n=data.notices.find(n=>n.id===id);if(!n)throw Error('Aviso no encontrado.');if(n.state==='cancelled'||n.state==='simulated')return;n.state='cancelled';this.log(data,n.id,'notification','Cancelada',n.audience,n.state,'Cancelación local. No hubo envío.');this.state.next(data);this.notice.next('Aviso cancelado en la DEMO.');}
 finishSimulation(id:string){const data=copy(this.state.value),n=data.notices.find(n=>n.id===id);if(!n||!noticeDue(n,this.clock()))throw Error('La simulación solo puede finalizarse una vez alcanzada la fecha programada.');n.state='simulated';this.log(data,n.id,'notification','Simulación finalizada',n.audience,n.state,'Acción manual ficticia. No se envió ni entregó una notificación.');this.state.next(data);this.notice.next('Simulación finalizada. Sin envío, recepción ni estadísticas reales.');}
 private syncPlannedNotice(data:PromotionData,p:Promotion){
  const old=data.notices.find(n=>n.promotionId===p.id);
  if(old&&(old.state==='simulated'||old.state==='cancelled'))return;
  if(!p.noticeAtStart){if(old){old.state='cancelled';this.log(data,old.id,'notification','Cancelada',old.audience,'cancelled','Se retiró la opción de aviso al inicio.');}return;}
  const kind='flash' as const;
  const n:DemoNotice={...(p.startAt===null?{date:'',time:''}:localFields(p.startAt)),id:old?.id||`DEMO-NOT-${data.notices.length+1}`,title:p.noticeTitle,message:p.noticeMessage,kind,audience:p.audience,state:p.mode==='draft'?'draft':'scheduled',scheduledAt:p.startAt,productId:p.productId,productName:p.productName,ingredientId:null,promotionId:p.id,offer:{productId:p.productId,productName:p.productName,referencePriceClp:p.referencePriceClp,promoPriceClp:p.promoPriceClp,startAt:p.startAt,endAt:p.endAt},isDemo:true};
  data.notices=old?data.notices.map(v=>v.id===old.id?n:v):[...data.notices,n];this.log(data,n.id,'notification',old?'Editada':'Preparada',n.audience,n.state,'Aviso ligado a promoción. El horario no realiza envíos ni finaliza simulaciones automáticamente.');
 }
 private log(data:PromotionData,reference:string,type:PromotionHistory['type'],action:string,audience:AudienceId,state:string,detail:string){data.history.push({id:`DEMO-HIS-${data.history.length+1}`,reference,at:this.clock(),type,action,audience,state,detail,isDemo:true});}
}
