import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { ClubEvent } from '../models/event.model';
import { AdminEvent } from '../admin/events/admin-event.model';
import { AdminDrink } from '../admin/drinks/admin-drink.model';
import { eventInstant, eventEndDate } from '../admin/events/admin-event-dates';
export interface PresentationOffer {id:string;name:string;productName:string;priceClp:number;startAt:number|null;endAt:number|null;mode:string;}
export const DRINK_LINKS:Record<string,string>={'admin-demo-drink-001':'piscola','admin-demo-drink-002':'gin-tonic','admin-demo-drink-003':'mojito','admin-demo-drink-004':'pisco-sour','admin-demo-drink-005':'ron-cola'};
@Injectable({providedIn:'root'})
export class PresentationBridgeService {
 private readonly eventState=new BehaviorSubject<Record<string,{event:ClubEvent;visible:boolean}>>({});readonly events$=this.eventState.asObservable();
 private readonly drinkState=new BehaviorSubject<Record<string,AdminDrink>>({});readonly drinks$=this.drinkState.asObservable();
 private readonly offers=new BehaviorSubject<Record<string,PresentationOffer>>({});readonly offers$=this.offers.pipe(map(v=>Object.values(v).filter(o=>o.mode==='scheduled')));
 eventSaved(e:AdminEvent){const id=e.id==='admin-demo-event-001'?'demo-void-sessions':e.id,from=eventInstant(e.date,e.startsAt),to=eventInstant(eventEndDate(e),e.endsAt);if(from===null||to===null)return;const event:ClubEvent={id,name:e.name,description:e.description,startsAt:new Date(from).toISOString(),endsAt:new Date(to).toISOString(),category:'Club VOID',imageUrl:e.image,featured:false,isDemo:true};this.eventState.next({...this.eventState.value,[id]:{event,visible:e.status==='published'}});}
 drinkFor(id:string){const d=this.drinkState.value[id];return d?{...d}:null;}
 drinkSaved(d:AdminDrink){const id=DRINK_LINKS[d.id]||d.id;this.drinkState.next({...this.drinkState.value,[id]:{...d}});}
 offerSaved(o:PresentationOffer){this.offers.next({...this.offers.value,[o.id]:{...o}});}
}
