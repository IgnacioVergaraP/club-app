import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { ADMIN_DEMO_EVENTS } from './admin-events.data';
import { AdminEvent, AdminEventDraft, AdminEventStatus } from './admin-event.model';
import { validateAdminEvent } from './admin-event.validation';
import { eventEndDate, scheduleSignature, validEventPeriod } from './admin-event-dates';

// Lista explícita: no arrastrar ventas, pedidos, QR u otras propiedades históricas.
const payload = (value: AdminEventDraft): AdminEventDraft => ({
  name:value.name.trim(), description:value.description.trim(), date:value.date, startsAt:value.startsAt,
  endsAt:value.endsAt, endsNextDay:value.endsNextDay, endsOn:eventEndDate(value), image:value.image,status:value.status,
  ticketTypes:value.ticketTypes.map(type=>({name:type.name.trim(),priceClp:type.priceClp,capacity:type.capacity,maxPerPurchase:type.maxPerPurchase,status:type.status}))
});
const copy = (event: AdminEvent): AdminEvent => ({...payload(event),id:event.id,isDemo:true,...(event.requiresDateReview?{requiresDateReview:true,duplicatedSchedule:event.duplicatedSchedule}:{})});
@Injectable()
export class AdminEventsService {
  private nextId=5;
  private readonly records=new BehaviorSubject<AdminEvent[]>(ADMIN_DEMO_EVENTS.map(copy));
  readonly events$=this.records.pipe(map(events=>events.map(copy)));

  save(draft: AdminEventDraft, id?: string, reviewedDate = false): AdminEvent {
    validateAdminEvent(draft);
    const previous=this.records.value.find(event=>event.id===id);
    if (id&&!previous) throw new Error('Este evento DEMO ya no está disponible.');
    const needsReview=!!previous?.requiresDateReview && !(reviewedDate&&validEventPeriod(draft.date,draft.startsAt,eventEndDate(draft),draft.endsAt)&&draft.date!==previous.duplicatedSchedule?.split('|')[0]);
    if (draft.status==='published'&&needsReview) throw new Error('Actualiza la fecha de inicio y confirma la programación de la copia antes de publicarla.');
    const record: AdminEvent={...payload(draft),id:id||this.newId(),isDemo:true,...(needsReview?{requiresDateReview:true,duplicatedSchedule:previous!.duplicatedSchedule}:{})};
    this.records.next(id?this.records.value.map(event=>event.id===id?record:event):[...this.records.value,record]);
    return copy(record);
  }
  changeStatus(id:string,status:AdminEventStatus):void {
    const record=this.records.value.find(event=>event.id===id);
    if(!record) throw new Error('Este evento DEMO ya no está disponible.');
    this.save({...payload(record),status},id);
  }
  duplicate(id:string):AdminEvent {
    const source=this.records.value.find(event=>event.id===id);
    if(!source) throw new Error('Este evento DEMO ya no está disponible.');
    const record:AdminEvent={...payload(source),id:this.newId(),status:'draft',isDemo:true,requiresDateReview:true,duplicatedSchedule:scheduleSignature(source)};
    this.records.next([...this.records.value,record]);return copy(record);
  }
  private newId():string {return `admin-demo-event-${String(this.nextId++).padStart(3,'0')}`;}
}
