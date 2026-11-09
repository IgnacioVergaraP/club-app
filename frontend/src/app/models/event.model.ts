/** Evento de descubrimiento. No representa una entrada ni una compra. */
export interface ClubEvent {
  id: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  category: string;
  imageUrl?: string;
  featured: boolean;
  isDemo: boolean;
}
