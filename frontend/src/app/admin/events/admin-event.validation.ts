import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AdminEventDraft, EVENT_IMAGES, EVENT_LIMITS, EVENT_STATUSES, TICKET_STATUSES } from './admin-event.model';

export function validEventDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
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
  if (!validEventSchedule(control.get('startsAt')?.value || '', control.get('endsAt')?.value || '', !!control.get('endsNextDay')?.value)) errors['schedule'] = true;
  const types = control.get('ticketTypes')?.value as {name: string}[] || [];
  if (control.get('status')?.value === 'published' && !types.length) errors['publishTickets'] = true;
  const names = types.map(type => type.name.trim().toLocaleLowerCase('es'));
  if (new Set(names).size !== names.length) errors['duplicateTickets'] = true;
  return Object.keys(errors).length ? errors : null;
};

// Defensa del servicio además de las validaciones de presentación.
export function validateAdminEvent(value: AdminEventDraft): void {
  const boundedText = (text: string, limit: number, required = true) => typeof text === 'string' && (!required || !!text.trim()) && text.trim().length <= limit;
  const number = (n: number, min: number, max: number) => Number.isSafeInteger(n) && n >= min && n <= max;
  if (!value || !boundedText(value.name, EVENT_LIMITS.name) || !boundedText(value.description, EVENT_LIMITS.description, false)
      || !validEventDate(value.date) || typeof value.endsNextDay !== 'boolean' || !validEventSchedule(value.startsAt, value.endsAt, value.endsNextDay)
      || !EVENT_IMAGES.some(image => image.value === value.image) || !EVENT_STATUSES.some(state => state.value === value.status)
      || !Array.isArray(value.ticketTypes) || value.ticketTypes.length > EVENT_LIMITS.ticketTypes
      || (value.status === 'published' && !value.ticketTypes.length)) throw new Error('Revisa nombre, fecha, horario, imagen y entradas antes de guardar.');
  const names = value.ticketTypes.map(type => type.name.trim().toLocaleLowerCase('es'));
  if (new Set(names).size !== names.length) throw new Error('Los tipos de entrada deben tener nombres diferentes.');
  for (const type of value.ticketTypes) {
    if (!boundedText(type.name, EVENT_LIMITS.ticketName) || !number(type.priceClp, 0, EVENT_LIMITS.priceClp)
        || !number(type.capacity, 1, EVENT_LIMITS.capacity) || !number(type.maxPerPurchase, 1, Math.min(type.capacity, EVENT_LIMITS.maxPerPurchase))
        || !TICKET_STATUSES.some(state => state.value === type.status)) throw new Error('Revisa el nombre, precio, cupo y máximo de cada tipo de entrada.');
  }
}
