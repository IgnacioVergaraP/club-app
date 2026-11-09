import { WalletData, WalletEvent } from '../models/wallet.model';
import { MOCK_EVENTS } from './mock-events';
import { MOCK_PRODUCTS } from './mock-products';

/** Ejemplos independientes de pedidos, selección, Fintoc o confirmaciones de pago. */
const nextEvent: WalletEvent = {
  id: MOCK_EVENTS[0].id, name: MOCK_EVENTS[0].name,
  startsAt: MOCK_EVENTS[0].startsAt, imageUrl: MOCK_EVENTS[0].imageUrl
};
const archiveEvent: WalletEvent = {
  id: 'demo-wallet-october', name: 'VOID · Noche de octubre',
  startsAt: '2026-10-24T23:00:00-03:00', imageUrl: 'assets/events/void-dj.jpg'
};
const earlierEvent: WalletEvent = {
  id: 'demo-wallet-september', name: 'VOID · Sesión de septiembre',
  startsAt: '2026-09-26T23:00:00-03:00', imageUrl: 'assets/events/void-urban.jpg'
};
const product = (id: string) => MOCK_PRODUCTS.find(item => item.id === id)!;

export const MOCK_WALLET: WalletData = {
  tickets: [
    { id: 'demo-ticket-001', event: nextEvent, ticketType: 'General', status: 'available', reference: 'DEMO-ENT-001', isDemo: true },
    { id: 'demo-ticket-002', event: archiveEvent, ticketType: 'VIP', status: 'used', reference: 'DEMO-ENT-002', isDemo: true },
    { id: 'demo-ticket-003', event: earlierEvent, ticketType: 'General', status: 'expired', reference: 'DEMO-ENT-003', isDemo: true }
  ],
  drinks: [
    { id: 'demo-drink-001', event: nextEvent, productId: 'piscola', productName: product('piscola').name,
      imageUrl: product('piscola').imageUrl, quantity: 2, status: 'pending', reference: 'DEMO-CON-001', isDemo: true },
    { id: 'demo-drink-002', event: archiveEvent, productId: 'mojito', productName: product('mojito').name,
      imageUrl: product('mojito').imageUrl, quantity: 1, status: 'redeemed', reference: 'DEMO-CON-002', isDemo: true },
    { id: 'demo-drink-003', event: earlierEvent, productId: 'gin-tonic', productName: product('gin-tonic').name,
      imageUrl: product('gin-tonic').imageUrl, quantity: 1, status: 'expired', reference: 'DEMO-CON-003', isDemo: true }
  ],
  activities: [
    { id: 'demo-activity-001', type: 'ticket_added', title: 'Entrada de ejemplo agregada',
      description: 'Registro ficticio para mostrar una entrada General. Sin compra ni emisión real.',
      occurredAt: '2026-11-02T18:00:00-03:00', status: 'completed', reference: 'DEMO-MOV-001', event: nextEvent, isDemo: true },
    { id: 'demo-activity-002', type: 'drink_added', title: 'Consumos de ejemplo agregados',
      description: 'Dos Piscolas ilustrativas. No representan una reserva ni un pedido confirmado.',
      occurredAt: '2026-11-02T17:55:00-03:00', status: 'pending', reference: 'DEMO-MOV-002', event: nextEvent, isDemo: true },
    { id: 'demo-activity-003', type: 'drink_redeemed', title: 'Canje simulado de bebida',
      description: 'Ejemplo visual de un consumo canjeado. No se retiró ninguna bebida.',
      occurredAt: '2026-10-25T01:30:00-03:00', status: 'completed', reference: 'DEMO-MOV-003', event: archiveEvent, isDemo: true },
    { id: 'demo-activity-004', type: 'ticket_used', title: 'Uso simulado de entrada',
      description: 'Ejemplo de estado utilizado. No acredita ingreso a un evento.',
      occurredAt: '2026-10-25T00:10:00-03:00', status: 'completed', reference: 'DEMO-MOV-004', event: archiveEvent, isDemo: true },
    { id: 'demo-activity-005', type: 'expired', title: 'Vencimiento de ejemplo',
      description: 'Registro ficticio de vencimiento de los ejemplos de septiembre.',
      occurredAt: '2026-09-27T06:00:00-03:00', status: 'expired', reference: 'DEMO-MOV-005', event: earlierEvent, isDemo: true }
  ]
};
