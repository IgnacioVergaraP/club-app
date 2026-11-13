export type AdminEventStatus = 'draft' | 'published' | 'cancelled' | 'finished';
export type AdminTicketStatus = 'available' | 'inactive';
export interface AdminTicketType {
  name: string;
  priceClp: number;
  capacity: number;
  maxPerPurchase: number;
  status: AdminTicketStatus;
}
export interface AdminEventDraft {
  name: string;
  description: string;
  date: string;
  startsAt: string;
  endsAt: string;
  endsNextDay: boolean;
  image: string;
  status: AdminEventStatus;
  ticketTypes: AdminTicketType[];
}
export interface AdminEvent extends AdminEventDraft {
  id: string;
  isDemo: true;
}
export const EVENT_STATUSES: readonly { value: AdminEventStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' }, { value: 'published', label: 'Publicado' },
  { value: 'cancelled', label: 'Cancelado' }, { value: 'finished', label: 'Finalizado' }
];
export const TICKET_STATUSES: readonly { value: AdminTicketStatus; label: string }[] = [
  { value: 'available', label: 'Disponible DEMO' }, { value: 'inactive', label: 'Inactivo' }
];
export const EVENT_IMAGES = [
  { value: 'assets/events/void-dancefloor.jpg', label: 'Pista VOID' },
  { value: 'assets/events/void-dj.jpg', label: 'DJ VOID' },
  { value: 'assets/events/void-urban.jpg', label: 'Ritmo local' }
] as const;
export const EVENT_LIMITS = { name: 100, description: 1200, ticketName: 50, ticketTypes: 12, priceClp: 10000000, capacity: 100000, maxPerPurchase: 100 } as const;
