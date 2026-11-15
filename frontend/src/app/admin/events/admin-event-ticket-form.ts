import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AdminTicketType, EVENT_LIMITS } from './admin-event.model';
import { integerRange, requiredTrimmed, ticketCapacityValidator } from './admin-event.validation';
export function createTicketForm(type?:AdminTicketType) {
  return new FormGroup({
    name:new FormControl(type?.name||'',{nonNullable:true,validators:[requiredTrimmed,Validators.maxLength(EVENT_LIMITS.ticketName)]}),
    priceClp:new FormControl<number|null>(type?type.priceClp:0,{validators:[integerRange(0,EVENT_LIMITS.priceClp)]}),
    capacity:new FormControl<number|null>(type?type.capacity:100,{validators:[integerRange(1,EVENT_LIMITS.capacity)]}),
    maxPerPurchase:new FormControl<number|null>(type?type.maxPerPurchase:10,{validators:[integerRange(1,EVENT_LIMITS.maxPerPurchase)]}),
    status:new FormControl<AdminTicketType['status']>(type?.status||'available',{nonNullable:true,validators:[Validators.required]})
  },{validators:[ticketCapacityValidator]});
}
export type AdminTicketForm = ReturnType<typeof createTicketForm>;
