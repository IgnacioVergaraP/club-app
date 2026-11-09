import { ClubEvent } from './event.model';

/** Snapshot visual de un evento ficticio; no contiene autorizaciones. */
export type WalletEvent = Pick<ClubEvent, 'id' | 'name' | 'startsAt' | 'imageUrl'>;
export type WalletTicketStatus = 'available' | 'used' | 'expired';
export type WalletDrinkStatus = 'pending' | 'redeemed' | 'expired';
export type WalletActivityType = 'ticket_added' | 'drink_added' | 'ticket_used' | 'drink_redeemed' | 'expired';

export interface WalletTicket {
  id: string;
  event: WalletEvent;
  ticketType: 'General' | 'VIP';
  status: WalletTicketStatus;
  reference: string;
  isDemo: true;
}

export interface WalletDrink {
  id: string;
  event: WalletEvent;
  productId: string;
  productName: string;
  imageUrl?: string;
  quantity: number;
  status: WalletDrinkStatus;
  reference: string;
  isDemo: true;
}

export interface WalletActivity {
  id: string;
  type: WalletActivityType;
  title: string;
  description: string;
  occurredAt: string;
  status: 'completed' | 'pending' | 'expired';
  reference: string;
  event?: WalletEvent;
  isDemo: true;
}

export interface WalletData {
  tickets: WalletTicket[];
  drinks: WalletDrink[];
  activities: WalletActivity[];
}

export interface WalletOverview {
  ticketCount: number;
  drinkUnits: number;
  nextEvent: WalletEvent | null;
}
