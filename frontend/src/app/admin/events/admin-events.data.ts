import { AdminEvent } from './admin-event.model';

// Datos exclusivos de administración. No importar al catálogo público.
export const ADMIN_DEMO_EVENTS: readonly AdminEvent[] = [
  { id: 'admin-demo-event-001', isDemo: true, name: 'VOID Sessions', description: 'Escenario de electrónica y house para probar la gestión de eventos.', date: '2026-11-20', startsAt: '23:00', endsAt: '05:00', endsNextDay: true, image: 'assets/events/void-dancefloor.jpg', status: 'published', ticketTypes: [
    { name: 'General', priceClp: 12000, capacity: 100, maxPerPurchase: 10, status: 'available' }, { name: 'VIP', priceClp: 25000, capacity: 40, maxPerPurchase: 4, status: 'available' }
  ] },
  { id: 'admin-demo-event-002', isDemo: true, name: 'VOID · After Hours', description: 'Borrador ficticio para preparar una nueva fecha.', date: '2026-11-28', startsAt: '23:00', endsAt: '06:00', endsNextDay: true, image: 'assets/events/void-dj.jpg', status: 'draft', ticketTypes: [] },
  { id: 'admin-demo-event-003', isDemo: true, name: 'VOID · Ritmo local', description: 'Cancelación ilustrativa; no corresponde a ventas o devoluciones reales.', date: '2026-11-29', startsAt: '22:00', endsAt: '04:00', endsNextDay: true, image: 'assets/events/void-urban.jpg', status: 'cancelled', ticketTypes: [
    { name: 'General', priceClp: 10000, capacity: 80, maxPerPurchase: 5, status: 'inactive' }
  ] },
  { id: 'admin-demo-event-004', isDemo: true, name: 'VOID · Archivo de octubre', description: 'Evento finalizado de ejemplo para revisar el historial administrativo.', date: '2026-10-24', startsAt: '23:00', endsAt: '05:00', endsNextDay: true, image: 'assets/events/void-dancefloor.jpg', status: 'finished', ticketTypes: [
    { name: 'General', priceClp: 10000, capacity: 100, maxPerPurchase: 10, status: 'inactive' }
  ] }
];
