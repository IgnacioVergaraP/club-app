import { AdminStaffRole } from '../staff/admin-staff.model';
export type AudienceId='clients'|'clients-consented'|AdminStaffRole;
export interface AudiencePlan {target:AudienceId;adultOnly:boolean;consentRequired:boolean;verified:false;}
export interface LocalSchedule {startDate:string;startTime:string;endDate:string;endTime:string;}
export type PromotionModality='instant'|'scheduled';
export type PromotionMode='draft'|'scheduled'|'cancelled';
export type PromotionStatus=PromotionMode|'active'|'finished';
export interface PromotionDraft extends LocalSchedule {name:string;description:string;productId:string;referencePriceClp:number;promoPriceClp:number;mode:'draft'|'scheduled';audience:AudienceId;noticeTitle:string;noticeMessage:string;noticeAtStart:boolean;modality?:PromotionModality;durationMinutes?:number|null;}
export interface OfferSnapshot {productId:string;productName:string;referencePriceClp:number;promoPriceClp:number;startAt:number|null;endAt:number|null;}
export interface Promotion extends Omit<PromotionDraft,'mode'> {id:string;mode:PromotionMode;productName:string;startAt:number|null;endAt:number|null;modality:PromotionModality;durationMinutes:number|null;activatedAt:number|null;isDemo:true;}
export type NoticeKind='promotion'|'flash'|'event'|'bar'|'door'|'stock'|'supervisor'|'incident';
export type NoticeState='draft'|'scheduled'|'simulated'|'cancelled';
export interface NoticeDraft {title:string;message:string;kind:NoticeKind;audience:AudienceId;date:string;time:string;mode:'draft'|'scheduled';productId:string|null;ingredientId:string|null;}
export interface DemoNotice extends Omit<NoticeDraft,'mode'> {id:string;state:NoticeState;scheduledAt:number|null;productName:string;promotionId:string|null;offer:OfferSnapshot|null;isDemo:true;}
export interface PromotionHistory {id:string;reference:string;at:number;type:'promotion'|'notification';action:string;audience:AudienceId;state:string;detail:string;isDemo:true;}
export interface PromotionData {promotions:Promotion[];notices:DemoNotice[];history:PromotionHistory[];}
export interface PromotionSummary {registered:number;scheduled:number;active:number;finished:number;}
export interface NoticePreview {title:string;message:string;productName:string;priceClp:number|null;schedule:string;audience:AudienceId;}
export const PROMOTION_LABELS:Record<PromotionStatus,string>={draft:'Borrador',scheduled:'Programada',active:'Activa',finished:'Finalizada',cancelled:'Cancelada'};
export const NOTICE_LABELS:Record<NoticeState,string>={draft:'Borrador',scheduled:'Programada',simulated:'Simulación finalizada',cancelled:'Cancelada'};
export const NOTICE_KINDS:{value:NoticeKind;label:string;commercial:boolean}[]=[{value:'promotion',label:'Promoción',commercial:true},{value:'flash',label:'Oferta relámpago',commercial:true},{value:'event',label:'Información de evento',commercial:true},{value:'bar',label:'Aviso para barra',commercial:false},{value:'door',label:'Aviso para puerta',commercial:false},{value:'stock',label:'Stock bajo',commercial:false},{value:'supervisor',label:'Aviso para supervisores',commercial:false},{value:'incident',label:'Incidencia',commercial:false}];

export interface PromotionDraftProgress {step:number;furthest:number;}
export interface PromotionWizardPreview extends NoticePreview {image:string;normalPrice:number;discount:number;name:string;statusLabel:string;timingNote:string;}
