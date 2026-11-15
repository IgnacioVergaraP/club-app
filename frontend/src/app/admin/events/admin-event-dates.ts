/** Fechas de calendario sin depender de la zona horaria del navegador. */
export const EVENT_TIMEZONE = 'America/Santiago';
export function validEventDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
export function nextEventDay(value: string): string {
  if (!validEventDate(value)) return '';
  const [y,m,d] = value.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d+1)).toISOString().slice(0,10);
}
export function eventEndDate(event: {date:string; endsOn?:string; endsNextDay:boolean}): string {
  return event.endsOn !== undefined ? event.endsOn : event.endsNextDay ? nextEventDay(event.date) : event.date;
}
const formatter = new Intl.DateTimeFormat('en-CA', {timeZone:EVENT_TIMEZONE, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function parts(ms: number): number[] {
  const values = formatter.formatToParts(new Date(ms));
  return ['year','month','day','hour','minute'].map(key => Number(values.find(item=>item.type===key)!.value));
}
const offsetsByDate = new Map<string,number[]>();
/** Devuelve un instante solo si la hora existe y no es ambigua por horario estacional. */
export function eventInstant(date: string, time: string): number | null {
  if (!validEventDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const expected = [...date.split('-').map(Number), ...time.split(':').map(Number)];
  const wall = Date.UTC(expected[0],expected[1]-1,expected[2],expected[3],expected[4]);
  if (!offsetsByDate.has(date)) {
    const offsets = new Set<number>();
    for (const hours of [-36,0,36]) {
      const sample = wall + hours*3600000, p = parts(sample);
      offsets.add(Date.UTC(p[0],p[1]-1,p[2],p[3],p[4])-sample);
    }
    offsetsByDate.set(date,[...offsets]);
  }
  const matches = offsetsByDate.get(date)!.map(offset => wall-offset).filter(ms=>parts(ms).every((value,index)=>value===expected[index]));
  return matches.length===1 ? matches[0] : null;
}
export function validEventPeriod(date: string, start: string, endDate: string, end: string): boolean {
  const from=eventInstant(date,start), to=eventInstant(endDate,end);
  return from!==null && to!==null && to>from && to-from<=86400000;
}
export function formatEventDay(date: string, weekday = false): string {
  if (!validEventDate(date)) return 'Fecha pendiente';
  const [y,m,d]=date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CL',{timeZone:'UTC',...(weekday?{weekday:'long' as const}:{day:'2-digit' as const,month:'short' as const,year:'numeric' as const})}).format(new Date(Date.UTC(y,m-1,d)));
}
export function eventScheduleSummary(date: string, start: string, endDate: string, end: string): string {
  if (!validEventDate(date)||!validEventDate(endDate)||!start||!end) return 'Programación pendiente';
  return `${formatEventDay(date,true)} ${start} → ${formatEventDay(endDate,true)} ${end}`;
}
export function scheduleSignature(value: {date:string;startsAt:string;endsOn?:string;endsAt:string;endsNextDay:boolean}): string {
  return [value.date,value.startsAt,eventEndDate(value),value.endsAt].join('|');
}
