import { CLUB_CONFIG } from '../club.config';
import { AdminSale, AdminSalesFilters, AdminSalesSummary, AdminSalesView, AdminSaleType } from './admin-sale.model';
const zone = CLUB_CONFIG.settings.timezone;
export function saleDay(value: Date | string): string {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  return ['year','month','day'].map(k=>parts.find(p=>p.type===k)!.value).join('-');
}
export function validDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const value = new Date(day+'T12:00:00Z');
  return Number.isFinite(value.getTime()) && value.toISOString().slice(0,10) === day;
}
export function shiftDay(day: string, amount: number): string {
  const d = new Date(day+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+amount); return d.toISOString().slice(0,10);
}
export function saleDate(value: string): string { return new Intl.DateTimeFormat(CLUB_CONFIG.settings.locale,{timeZone:zone,day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)); }
export function saleTotal(sale: AdminSale): number { return sale.items.reduce((sum,i)=>sum+i.quantity*i.unitPriceClp,0); }
export function saleType(sale: AdminSale): AdminSaleType { const kinds=new Set(sale.items.map(i=>i.kind)); return kinds.size>1?'mixed':sale.items[0].kind; }
export function summarize(sales: AdminSale[]): AdminSalesSummary {
  const paid=sales.filter(s=>s.paymentStatus==='approved'); const total=paid.reduce((sum,s)=>sum+saleTotal(s),0);
  const units=(kind:'ticket'|'drink')=>paid.reduce((sum,s)=>sum+s.items.filter(i=>i.kind===kind).reduce((n,i)=>n+i.quantity,0),0);
  return {totalSalesClp:total,orders:sales.length,approvedOrders:paid.length,averageTicketClp:paid.length?Math.round(total/paid.length):0,ticketsSold:units('ticket'),drinksSold:units('drink')};
}
export function selectSales(source: AdminSale[], filters: AdminSalesFilters, today: string): AdminSalesView {
  let from=today,to=today,error='';
  if(filters.period==='yesterday') from=to=shiftDay(today,-1);
  if(filters.period==='week') from=shiftDay(today,-6);
  if(filters.period==='custom') {from=filters.from;to=filters.to;if(!validDay(from)||!validDay(to)||from>to) error='Selecciona fechas válidas: el inicio debe ser anterior o igual al fin.';}
  const sales=error?[]:source.filter(s=>{const day=saleDay(s.createdAt);return day>=from&&day<=to&&s.id.toLocaleLowerCase().includes(filters.search.trim().toLocaleLowerCase())&&(!filters.type||saleType(s)===filters.type)&&(!filters.payment||s.paymentStatus===filters.payment);});
  sales.sort((a,b)=>{const difference=filters.order.startsWith('amount')?saleTotal(a)-saleTotal(b):Date.parse(a.createdAt)-Date.parse(b.createdAt);return (filters.order.endsWith('desc')?-difference:difference)||a.id.localeCompare(b.id);});
  return {sales,summary:summarize(sales),error,from,to};
}

export function saleShortDate(value:string):string{return new Intl.DateTimeFormat(CLUB_CONFIG.settings.locale,{timeZone:zone,day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(value));}
