import { ClubEvent } from './event.model';

/** Tipo y precio ilustrativos. available no representa inventario real. */
export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description: string;
  priceClp: number;
  available: boolean;
  maxQuantity: number;
}

export interface TicketSelectionItem {
  ticket: TicketType;
  quantity: number;
  subtotalClp: number;
}

export interface TicketSelectionView {
  event: ClubEvent;
  types: TicketType[];
  quantities: Record<string, number>;
  subtotals: Record<string, number>;
  items: TicketSelectionItem[];
  totalUnits: number;
  subtotalClp: number;
  serviceFeeClp: number;
  totalClp: number;
  canSelect: boolean;
  valid: boolean;
}
