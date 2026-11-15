import { ValidationErrors, ValidatorFn } from '@angular/forms';
import { isEventImageReference } from './admin-event-image';
import { AdminEventDraft, EVENT_LIMITS, EVENT_STATUSES, TICKET_STATUSES } from './admin-event.model';

export { validEventDate } from './admin-event-dates';
import { validEventDate, eventEndDate, validEventPeriod } from './admin-event-dates';
export function validEventSchedule(start: string, end: string, nextDay: boolean): boolean {
  if (![start, end].every(value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value))) return false;
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const duration = minutes(end) + (nextDay ? 1440 : 0) - minutes(start);
  return duration > 0 && duration <= 1440;
}
export const requiredTrimmed: ValidatorFn = control => typeof control.value === 'string' && control.value.trim() ? null : { required: true };
export const integerRange = (min: number, max: number): ValidatorFn => control => typeof control.value === 'number' && Number.isSafeInteger(control.value) && control.value >= min && control.value <= max ? null : { integerRange: true };
export const eventDateValidator: ValidatorFn = control => validEventDate(control.value || '') ? null : { eventDate: true };
export const ticketCapacityValidator: ValidatorFn = control => control.get('maxPerPurchase')?.value <= control.get('capacity')?.value ? null : { ticketCapacity: true };
export const eventFormValidator: ValidatorFn = control => {
  const errors: ValidationErrors = {};
  if (!validEventPeriod(control.get('date')?.value || '',control.get('startsAt')?.value || '',control.get('endsOn')?.value || '',control.get('endsAt')?.value || '')) errors['schedule'] = true;
  const types = control.get('ticketTypes')?.value as {name:string}[] || [];
  if (!types.length) errors['publishTickets'] = true;
  const names=types.map(type=>type.name.trim().toLocaleLowerCase('es'));
  if (new Set(names).size!==names.length) errors['duplicateTickets'] = true;
  return Object.keys(errors).length ? errors : null;
};

const boundedText = (text: string, limit: number, required = true) => typeof text === 'string' && (!required || !!text.trim()) && text.length <= limit;
const number = (n: number | null, min: number, max: number) => typeof n==='number' && Number.isSafeInteger(n) && n>=min && n<=max;
export function validateAdminEvent(value: AdminEventDraft): void {
  // Los borradores guardan campos pendientes, pero solo publicamos registros íntegros.
  if (!value || !boundedText(value.name,EVENT_LIMITS.name) || !boundedText(value.description,EVENT_LIMITS.description,false)
    || !isEventImageReference(value.image) || !EVENT_STATUSES.some(state=>state.value===value.status)
    || !Array.isArray(value.ticketTypes) || value.ticketTypes.length>EVENT_LIMITS.ticketTypes
    || ![value.date,value.startsAt,value.endsAt].every(item=>typeof item==='string') || (value.endsOn!==undefined&&typeof value.endsOn!=='string'))
    throw new Error('Revisa el nombre, la imagen y los campos del evento antes de guardar.');
  for (const type of value.ticketTypes) {
    if (!type || !boundedText(type.name,EVENT_LIMITS.ticketName,false) || !TICKET_STATUSES.some(state=>state.value===type.status)
      || ![type.priceClp,type.capacity,type.maxPerPurchase].every(n=>n===null||(typeof n==='number'&&Number.isFinite(n))))
      throw new Error('Los tipos de entrada contienen datos no válidos para un borrador.');
  }
  if (value.status!=='published') return;
  if (!validEventPeriod(value.date,value.startsAt,eventEndDate(value),value.endsAt)||!value.ticketTypes.length)
    throw new Error('Revisa la programación en America/Santiago y agrega al menos un tipo de entrada antes de publicar.');
  const names=value.ticketTypes.map(type=>type.name.trim().toLocaleLowerCase('es'));
  if (new Set(names).size!==names.length) throw new Error('Los tipos de entrada deben tener nombres diferentes.');
  for (const type of value.ticketTypes) {
    if (!boundedText(type.name,EVENT_LIMITS.ticketName) || !number(type.priceClp,0,EVENT_LIMITS.priceClp)
      || !number(type.capacity,1,EVENT_LIMITS.capacity) || !number(type.maxPerPurchase,1,Math.min(type.capacity ?? 0,EVENT_LIMITS.maxPerPurchase)))
      throw new Error('Revisa el nombre, precio, cupo y máximo de cada tipo de entrada.');
  }
}
