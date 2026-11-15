export type AdminSalePaymentStatus = 'pending' | 'approved' | 'failed' | 'refunded';
export type AdminSaleFulfillmentStatus = 'pending' | 'partial' | 'completed' | 'not_applicable';
export type AdminSaleType = 'ticket' | 'drink' | 'mixed';
export interface AdminSaleItem { id: string; kind: 'ticket' | 'drink'; name: string; quantity: number; unitPriceClp: number; }
export interface AdminSale { id: string; createdAt: string; items: AdminSaleItem[]; paymentMethod: string; paymentStatus: AdminSalePaymentStatus; fulfillmentStatus: AdminSaleFulfillmentStatus; timeline: {at: string; title: string; description: string}[]; isDemo: true; }
export interface AdminSalesSummary { totalSalesClp: number; orders: number; approvedOrders: number; averageTicketClp: number; ticketsSold: number; drinksSold: number; }
export type AdminSalesPeriod = 'today' | 'yesterday' | 'week' | 'custom';
export type AdminSalesOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
export interface AdminSalesFilters { period: AdminSalesPeriod; from: string; to: string; search: string; type: AdminSaleType | ''; payment: AdminSalePaymentStatus | ''; order: AdminSalesOrder; }
export interface AdminSalesView { sales: AdminSale[]; summary: AdminSalesSummary; error: string; from: string; to: string; }
export const PAYMENT_LABELS: Record<AdminSalePaymentStatus,string> = {pending:'Pendiente',approved:'Aprobado',failed:'Fallido',refunded:'Reembolsado'};
export const FULFILLMENT_LABELS: Record<AdminSaleFulfillmentStatus,string> = {pending:'Pendiente',partial:'Parcial',completed:'Completado',not_applicable:'No corresponde'};
export const TYPE_LABELS: Record<AdminSaleType,string> = {ticket:'Entrada',drink:'Tragos',mixed:'Mixto'};
