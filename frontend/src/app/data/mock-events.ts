import { ClubEvent } from '../models/event.model';

/** Programación ficticia de demostración; no son eventos reales a la venta. */
export const MOCK_EVENTS: ReadonlyArray<Readonly<ClubEvent>> = [
  {
    id: 'demo-void-sessions',
    name: 'VOID Sessions',
    description: 'Una selección de house y electrónica para imaginar tu próxima noche en VOID.',
    startsAt: '2026-11-07T23:00:00-03:00',
    endsAt: '2026-11-08T05:00:00-03:00',
    category: 'House / Electrónica',
    imageUrl: 'assets/events/void-dancefloor.jpg',
    featured: true,
    isDemo: true
  },
  {
    id: 'demo-after-hours',
    name: 'After Hours',
    imageUrl: 'assets/events/void-dj.jpg',
    description: 'Ritmos electrónicos y una pista que sigue su propio pulso.',
    startsAt: '2026-11-14T23:00:00-03:00',
    endsAt: '2026-11-15T05:00:00-03:00',
    category: 'Tech house',
    featured: true,
    isDemo: true
  },
  {
    id: 'demo-ritmo-local',
    name: 'Ritmo Local',
    imageUrl: 'assets/events/void-urban.jpg',
    description: 'Una noche imaginada para descubrir nuevas mezclas y sonidos locales.',
    startsAt: '2026-11-21T22:00:00-03:00',
    endsAt: '2026-11-22T04:00:00-03:00',
    category: 'Urbano / Open format',
    featured: true,
    isDemo: true
  }
];
