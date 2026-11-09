import { MOCK_EVENTS } from '../data/mock-events';
import { eventStatus, eventStatusLabel } from './event-time';

describe('Estado temporal de eventos', () => {
  it('compara instantes con offset, incluyendo límites de inicio y fin', () => {
    const event = MOCK_EVENTS[0];
    expect(eventStatus(event, Date.parse('2026-11-08T01:59:59Z'))).toBe('upcoming');
    expect(eventStatus(event, Date.parse('2026-11-08T02:00:00Z'))).toBe('ongoing');
    expect(eventStatus(event, Date.parse('2026-11-08T08:00:00Z'))).toBe('ended');
    expect(eventStatusLabel('ended')).toBe('Evento finalizado');
  });

  it('tolera eventos sin fin usando el inicio como límite de evento anterior', () => {
    const event = { ...MOCK_EVENTS[0], endsAt: undefined };
    expect(eventStatus(event, Date.parse(event.startsAt))).toBe('ended');
  });
});
