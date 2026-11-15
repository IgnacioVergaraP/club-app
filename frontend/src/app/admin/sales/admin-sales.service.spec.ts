import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminSalesFilters } from './admin-sale.model';
import { AdminSalesService } from './admin-sales.service';
import { saleDay, saleTotal, saleType, shiftDay, validDay } from './admin-sales.logic';
import { WalletService } from '../../services/wallet.service';
const filters=(change:Partial<AdminSalesFilters>={}):AdminSalesFilters=>({period:'today',from:'2026-11-14',to:'2026-11-14',search:'',type:'',payment:'',order:'date-desc',...change});
describe('Admin sales read-only DEMO',()=>{
 let service:AdminSalesService;
 beforeEach(()=>service=new AdminSalesService(()=>new Date('2026-11-14T16:00:00Z')));
 it('calculates today from five orders, counting only approved money and units',async()=>{
  const view=await firstValueFrom(service.query(filters()));expect(view.sales.length).toBe(5);expect(view.summary).toEqual({totalSalesClp:69000,orders:5,approvedOrders:2,averageTicketClp:34500,ticketsSold:3,drinksSold:3});
 });
 it('calculates yesterday and the inclusive seven-day window from the same list',async()=>{
  const yesterday=await firstValueFrom(service.query(filters({period:'yesterday'})));expect(yesterday.summary).toEqual({totalSalesClp:35000,orders:3,approvedOrders:2,averageTicketClp:17500,ticketsSold:1,drinksSold:3});
  const week=await firstValueFrom(service.query(filters({period:'week'})));expect(week.from).toBe('2026-11-08');expect(week.summary).toEqual({totalSalesClp:156000,orders:10,approvedOrders:6,averageTicketClp:26000,ticketsSold:7,drinksSold:8});
 });
 it('includes both custom boundaries, supports one day and excludes the preceding day',async()=>{
  const all=await firstValueFrom(service.query(filters({period:'custom',from:'2026-10-25',to:'2026-11-14'})));expect(all.sales.length).toBe(12);expect(all.summary.averageTicketClp).toBe(25000);expect(all.summary.totalSalesClp).toBe(175000);
  const boundary=await firstValueFrom(service.query(filters({period:'custom',from:'2026-11-07',to:'2026-11-07'})));expect(boundary.sales.map(s=>s.id)).toEqual(['DEMO-ORD-0011']);
 });
 for(const [from,to] of [['','2026-11-14'],['2026-11-15','2026-11-14'],['2026-02-30','2026-11-14']]) it('rejects invalid or reversed range '+from,async()=>{const v=await firstValueFrom(service.query(filters({period:'custom',from,to})));expect(v.error).toBeTruthy();expect(v.summary.orders).toBe(0);expect(v.summary.averageTicketClp).toBe(0);});
 it('combines order search, date, type and payment and recomputes the summary',async()=>{
  const v=await firstValueFrom(service.query(filters({period:'week',search:'  demo-ord-0006  ',type:'mixed',payment:'approved'})));expect(v.sales.length).toBe(1);expect(v.summary.totalSalesClp).toBe(29000);expect(v.summary.ticketsSold).toBe(1);expect(v.summary.drinksSold).toBe(2);
  const none=await firstValueFrom(service.query(filters({payment:'pending',type:'drink'})));expect(none.sales.length).toBe(0);expect(none.summary.averageTicketClp).toBe(0);
 });
 it('excludes pending, failed and refunded money while retaining the matched order count',async()=>{
  for(const payment of ['pending','failed','refunded'] as const){const v=await firstValueFrom(service.query(filters({payment})));expect(v.summary.orders).toBe(1);expect(v.summary.totalSalesClp).toBe(0);expect(v.summary.ticketsSold+v.summary.drinksSold).toBe(0);}
 });
 it('orders dates and amounts in both directions deterministically',async()=>{
  for(const order of ['date-asc','date-desc','amount-asc','amount-desc'] as const){const v=await firstValueFrom(service.query(filters({period:'week',order})));const values=v.sales.map(s=>order.startsWith('amount')?saleTotal(s):Date.parse(s.createdAt));expect(values).toEqual([...values].sort((a,b)=>order.endsWith('desc')?b-a:a-b));}
 });
 it('has typed mixed items, unit prices, independent payment/fulfillment and chronological timeline',async()=>{
  const all=await firstValueFrom(service.getSales());expect(all.length).toBe(12);expect(all.every(s=>s.isDemo&&s.id.startsWith('DEMO-ORD-'))).toBeTrue();
  expect(all[0].paymentStatus).toBe('approved');expect(all[0].fulfillmentStatus).toBe('pending');expect(all[1].fulfillmentStatus).toBe('partial');expect(saleType(all[5])).toBe('mixed');expect(saleTotal(all[0])).toBe(49000);expect(all[0].items.map(i=>i.quantity)).toEqual([2,1]);
  for(const s of all){expect(s.timeline.map(t=>t.at)).toEqual([...s.timeline].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).map(t=>t.at));expect(s.items.every(i=>Number.isInteger(i.quantity)&&i.quantity>0)).toBeTrue();}
 });
 it('returns fresh nested copies for every subscription and handles missing IDs',async()=>{
  const stream=service.getSales();const a=await firstValueFrom(stream);a[0].items[0].unitPriceClp=1;a[0].timeline[0].title='mutated';a[0].paymentStatus='failed';a.pop();
  const b=await firstValueFrom(stream);expect(b.length).toBe(12);expect(saleTotal(b[0])).toBe(49000);expect(b[0].timeline[0].title).toBe('Pedido DEMO creado');expect(b[0].paymentStatus).toBe('approved');expect(await firstValueFrom(service.find('missing'))).toBeUndefined();
 });
 it('uses Chile calendar days across UTC midnight, DST and year boundaries',()=>{
  expect(saleDay('2026-11-15T01:00:00Z')).toBe('2026-11-14');expect(saleDay('2026-06-15T03:00:00Z')).toBe('2026-06-14');expect(shiftDay('2027-01-01',-1)).toBe('2026-12-31');expect(validDay('2028-02-29')).toBeTrue();expect(validDay('2026-02-29')).toBeFalse();
  const midnight=new AdminSalesService(()=>new Date('2026-11-15T01:00:00Z'));expect(midnight.today).toBe('2026-11-14');
 });
 it('reads without HTTP and cannot create or alter Wallet entries',async()=>{
  TestBed.configureTestingModule({imports:[HttpClientTestingModule]});const wallet=TestBed.inject(WalletService);const before=JSON.stringify(await firstValueFrom(wallet.getWallet()));await firstValueFrom(service.query(filters()));await firstValueFrom(service.find('DEMO-ORD-0003'));
  expect(JSON.stringify(await firstValueFrom(wallet.getWallet()))).toBe(before);TestBed.inject(HttpTestingController).expectNone(()=>true);TestBed.inject(HttpTestingController).verify();
 });
});
