import { ClubEvent } from '../models/event.model';

export type EventStatus = 'upcoming' | 'ongoing' | 'ended';

/** Comparar instantes absolutos; los ISO del catálogo incluyen su offset. */
export function eventStatus(event: ClubEvent, now = Date.now()): EventStatus {
  if (Date.parse(event.startsAt) > now) {
    return 'upcoming';
  }
  return Date.parse(event.endsAt ?? event.startsAt) > now ? 'ongoing' : 'ended';
}

export function eventStatusLabel(status: EventStatus): string {
  return { upcoming: 'Próximo evento', ongoing: 'En curso', ended: 'Evento finalizado' }[status];
}
