import { EVENT_TIMEZONE, eventInstant, validEventDate } from '../events/admin-event-dates';
import { STAFF_ROLES } from '../staff/admin-staff.model';
import { DRINK_LIMITS } from '../drinks/admin-drink.model';
import { AudienceId, AudiencePlan, DemoNotice, NoticeDraft, NOTICE_KINDS, Promotion, PromotionDraft, PromotionStatus, PromotionSummary } from './promotion.model';
export const PROMOTION_ZONE=EVENT_TIMEZONE;
export const PROMOTION_AUDIENCE='clients-consented' as const;
export const AUDIENCES:{value:AudienceId;label:string}[]=[{value:'clients',label:'Clientes'},{value:'clients-consented',label:'Clientes adultos con consentimiento (criterio futuro)'},...STAFF_ROLES.map(r=>({value:r.value,label:r.label}))];
export const isClient=(a:AudienceId)=>a==='clients'||a==='clients-consented';
export const audiencePlan=(target:AudienceId):AudiencePlan=>({target,adultOnly:isClient(target),consentRequired:isClient(target),verified:false});
export const audienceLabel=(a:AudienceId)=>AUDIENCES.find(v=>v.value===a)?.label||'Audiencia pendiente';
export const discount=(normal:number,promo:number)=>Number.isSafeInteger(normal)&&normal>0&&Number.isSafeInteger(promo)&&promo>0&&promo<normal?Math.round((normal-promo)*10000/normal)/100:0;
export const promotionStatus=(p:Pick<Promotion,'mode'|'startAt'|'endAt'>,now:number):PromotionStatus=>p.mode==='cancelled'?'cancelled':p.mode==='draft'?'draft':p.startAt===null||p.endAt===null?'scheduled':now<p.startAt?'scheduled':now>=p.endAt?'finished':'active';
export const promotionSummary=(promotions:Promotion[],now:number):PromotionSummary=>({registered:promotions.length,scheduled:promotions.filter(p=>promotionStatus(p,now)==='scheduled').length,active:promotions.filter(p=>promotionStatus(p,now)==='active').length,finished:promotions.filter(p=>promotionStatus(p,now)==='finished').length});
const dateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:PROMOTION_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function localFields(ms:number){const parts=dateFormatter.formatToParts(new Date(ms)),part=(key:string)=>parts.find(p=>p.type===key)!.value;return {date:`${part('year')}-${part('month')}-${part('day')}`,time:`${part('hour')}:${part('minute')}`};}
export function dayOffset(date:string,n:number):string {if(!validEventDate(date))return '';const [y,m,d]=date.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10);}
export const formatPromotionTime=(ms:number|null)=>typeof ms==='number'&&Number.isFinite(ms)?new Intl.DateTimeFormat('es-CL',{timeZone:PROMOTION_ZONE,day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms)):'Se definirá al activar';
export const scheduleLabel=(from:number|null,to?:number|null)=>`${formatPromotionTime(from)}${to!==undefined?' → '+formatPromotionTime(to):''} · ${PROMOTION_ZONE}`;
const text=(value:unknown,min:number,max:number)=>typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max;
const price=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0&&value<=DRINK_LIMITS.priceClp;
export const PROMOTION_MAX_MINUTES=1440;
export const validDuration=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=1&&value<=PROMOTION_MAX_MINUTES;
export interface PromotionValidation {now?:number;incompleteDraft?:boolean;existing?:Promotion;}
export function validatePromotion(d:PromotionDraft,productIds:string[],options:PromotionValidation={}):{startAt:number|null;endAt:number|null}{
 if(!d||!text(d.name,1,80)||!text(d.description,0,300))throw Error('Indica un nombre de 1 a 80 caracteres y una descripción de hasta 300.');
 const incomplete=options.incompleteDraft===true;
 if((!incomplete||!!d.productId)&&!productIds.includes(d.productId))throw Error('Selecciona un producto válido del catálogo administrativo.');
 const draftPrice=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=DRINK_LIMITS.priceClp;
 if(incomplete?(!draftPrice(d.referencePriceClp)||!draftPrice(d.promoPriceClp)):(!price(d.referencePriceClp)||!price(d.promoPriceClp)||d.promoPriceClp>=d.referencePriceClp))throw Error('El precio promocional debe ser un entero positivo menor al precio normal de referencia (máximo $10.000.000).');
 if(!['draft','scheduled'].includes(d.mode)||d.audience!==PROMOTION_AUDIENCE)throw Error('Las promociones están dirigidas exclusivamente a clientes. Selecciona un estado válido.');
 const modality=d.modality||'scheduled';if(!['instant','scheduled'].includes(modality))throw Error('Selecciona una modalidad válida.');
 if(typeof d.noticeAtStart!=='boolean'||!text(d.noticeTitle,d.noticeAtStart&&!incomplete?1:0,80)||!text(d.noticeMessage,d.noticeAtStart&&!incomplete?1:0,240))throw Error('El aviso al inicio requiere título (máximo 80) y mensaje (máximo 240).');
 let startAt:number|null=null,endAt:number|null=null;
 if(modality==='instant'){
  if(!incomplete&&!validDuration(d.durationMinutes))throw Error('La duración debe ser un número entero de 1 a 1.440 minutos.');
  if(d.mode==='scheduled'){
   if(options.existing?.mode==='scheduled'){startAt=options.existing.startAt;endAt=options.existing.endAt;}
   else{if(!Number.isSafeInteger(options.now))throw Error('La activación requiere el reloj actual de publicación.');startAt=options.now!;endAt=startAt+(d.durationMinutes as number)*60000;}
  }
 }else{
  startAt=eventInstant(d.startDate,d.startTime);endAt=eventInstant(d.endDate,d.endTime);
  if(startAt===null||endAt===null||endAt<=startAt){if(!incomplete)throw Error('Revisa las fechas y horas de Santiago: el término debe ser posterior al inicio. Usa fechas explícitas al cruzar medianoche; horas estacionales ambiguas o inexistentes no son válidas.');startAt=null;endAt=null;}
 }

 return {startAt,endAt};
}
export function validateNotice(d:NoticeDraft,productIds:string[],ingredientIds:string[]):number{
 if(!d||!text(d.title,1,80)||!text(d.message,1,240))throw Error('Indica título de 1 a 80 caracteres y mensaje de 1 a 240.');
 const kind=NOTICE_KINDS.find(k=>k.value===d.kind);if(!kind||!AUDIENCES.some(a=>a.value===d.audience)||kind.commercial!==isClient(d.audience))throw Error('Avisos comerciales: audiencia de clientes. Avisos operativos: un perfil de personal.');
 if(!['draft','scheduled'].includes(d.mode)||!(d.productId===null||productIds.includes(d.productId))||!(d.ingredientId===null||ingredientIds.includes(d.ingredientId)))throw Error('Estado o referencia  inválidos.');
 const at=eventInstant(d.date,d.time);if(at===null)throw Error('Indica fecha y hora válidas y no ambiguas en America/Santiago.');return at;
}
export type PromotionPeriod='all'|'today'|'week'|'custom';
export function periodRange(period:string,now:number,from:string,to:string):{from:string;to:string;valid:boolean}{const today=localFields(now).date;if(period==='all')return {from:'',to:'',valid:true};if(period==='today')return {from:today,to:today,valid:true};if(period==='week')return {from:dayOffset(today,-6),to:today,valid:true};return {from,to,valid:period==='custom'&&validEventDate(from)&&validEventDate(to)&&to>=from};}
export function inPeriod(start:number|null,end:number|null,range:ReturnType<typeof periodRange>):boolean {if(!range.valid)return false;if(!range.from)return true;if(start===null||end===null)return false;return localFields(start).date<=range.to&&localFields(Math.max(start,end-1)).date>=range.from;}
export function noticeDue(n:DemoNotice,now:number){return n.state==='scheduled'&&n.scheduledAt!==null&&n.scheduledAt<=now;}
