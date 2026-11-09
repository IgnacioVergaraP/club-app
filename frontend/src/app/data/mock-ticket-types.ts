import { MOCK_EVENTS } from './mock-events';
import { TicketType } from '../models/ticket.model';

/** Importes ilustrativos CLP. No son inventario, reservas ni precios de venta reales. */
export const MOCK_TICKET_TYPES: ReadonlyArray<Readonly<TicketType>> = MOCK_EVENTS.flatMap(event => [
  {
    id: `${event.id}-general`, eventId: event.id, name: 'Entrada General',
    description: 'Acceso general ilustrativo para esta noche.',
    priceClp: 12000, available: true, maxQuantity: 10
  },
  {
    id: `${event.id}-vip`, eventId: event.id, name: 'Entrada VIP',
    description: 'Categoría especial de demostración. Beneficios por definir.',
    priceClp: 25000, available: true, maxQuantity: 10
  }
]);
