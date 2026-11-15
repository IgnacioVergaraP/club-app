import { eventEndDate, eventInstant, eventScheduleSummary, formatEventDay, validEventDate, validEventPeriod } from './admin-event-dates';
describe('Event dates in America/Santiago',()=>{
  it('validates calendar days and leap years without rollover',()=>{expect(validEventDate('2026-02-30')).toBeFalse();expect(validEventDate('2028-02-29')).toBeTrue();expect(validEventDate('2026-02-29')).toBeFalse();});
  it('accepts a same-day event',()=>{expect(validEventPeriod('2026-12-04','18:00','2026-12-04','23:00')).toBeTrue();});
  it('accepts crossing midnight with explicit end date',()=>{expect(validEventPeriod('2026-12-04','23:00','2026-12-05','05:00')).toBeTrue();});
  it('rejects preceding, equal and over-24h ends',()=>{for(const [day,time]of[['2026-12-03','23:00'],['2026-12-04','23:00'],['2026-12-06','00:00']])expect(validEventPeriod('2026-12-04','23:00',day,time)).toBeFalse();});
  it('resolves Chile time independently of the host timezone',()=>{expect(new Date(eventInstant('2026-12-04','23:00')!).toISOString()).toBe('2026-12-05T02:00:00.000Z');});
  it('rejects nonexistent and ambiguous daylight-saving clock readings',()=>{expect(eventInstant('2026-09-06','00:30')).toBeNull();expect(eventInstant('2026-04-04','23:30')).toBeNull();});
  it('formats Spanish calendar weekdays without changing visible days',()=>{expect(eventScheduleSummary('2026-12-04','23:00','2026-12-05','05:00')).toBe('viernes 23:00 → sábado 05:00');expect(formatEventDay('2026-12-04')).toContain('04');});
  it('reads legacy next-day records and partial drafts compatibly',()=>{expect(eventEndDate({date:'2026-12-04',endsNextDay:true})).toBe('2026-12-05');expect(eventEndDate({date:'',endsOn:'',endsNextDay:true})).toBe('');});
});
