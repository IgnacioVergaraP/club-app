import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AdminSalesService } from '../sales/admin-sales.service';
import { WalletService } from '../../services/wallet.service';
import { AdminCommissionsService } from './admin-commissions.service';
import { AdminCommissionFilters, DEFAULT_COMMISSION_CONFIG } from './admin-commission.model';
const filters=(change:Partial<AdminCommissionFilters>={}):AdminCommissionFilters=>({period:'week',from:'2026-11-15',to:'2026-11-15',search:'',payment:'',order:'date-desc',...change});
describe('AdminCommissionsService read-only sales source',()=>{
 let sales:AdminSalesService,service:AdminCommissionsService;
 beforeEach(()=>{sales=new AdminSalesService(()=>new Date('2026-11-15T16:00:00Z'));service=new AdminCommissionsService(sales);});
 it('reuses Sales records and gross for the same filters without importing real payments',async()=>{
  const report=await firstValueFrom(service.report(filters()));const selection=await firstValueFrom(sales.query({...filters(),type:''}));expect(report.operations.map(o=>o.sale)).toEqual(selection.sales);expect(report.summary.grossClp).toBe(selection.summary.totalSalesClp);expect(report.summary).toEqual({approvedCount:6,pendingCount:2,refundedCount:1,failedCount:1,grossClp:156000,codetecClp:7800,processorClp:4524,clubEstimatedClp:143676,codetecRetainedClp:7800});
 });
 it('handles today, yesterday and inclusive custom boundaries',async()=>{
  expect((await firstValueFrom(service.report(filters({period:'today'})))).summary.grossClp).toBe(69000);expect((await firstValueFrom(service.report(filters({period:'yesterday'})))).summary.grossClp).toBe(35000);
  const all=await firstValueFrom(service.report(filters({period:'custom',from:'2026-10-26',to:'2026-11-15'})));expect(all.operations.length).toBe(12);expect(all.summary).toEqual({approvedCount:7,pendingCount:2,refundedCount:2,failedCount:1,grossClp:175000,codetecClp:8750,processorClp:5075,clubEstimatedClp:161175,codetecRetainedClp:8750});
 });
 it('combines reference/status and excludes pending/refunded finances, supports empty/range errors',async()=>{
  const one=await firstValueFrom(service.report(filters({search:'  demo-ord-0006 ',payment:'approved'})));expect(one.operations.length).toBe(1);expect(one.summary.clubEstimatedClp).toBe(26709);
  const pending=await firstValueFrom(service.report(filters({payment:'pending'})));expect(pending.operations.length).toBe(2);expect(pending.summary.grossClp+pending.summary.codetecClp+pending.summary.processorClp).toBe(0);
  const none=await firstValueFrom(service.report(filters({search:'missing'})));expect(none.operations.length).toBe(0);expect(none.summary.approvedCount).toBe(0);
  const invalid=await firstValueFrom(service.report(filters({period:'custom',from:'2026-11-16',to:'2026-11-15'})));expect(invalid.error).toBeTruthy();expect(invalid.operations.length).toBe(0);
 });
 it('updates subscribers from applied settings, keeps copied config and resets only in a new service',async()=>{
  const totals:number[]=[];const subscription=service.report(filters()).subscribe(v=>totals.push(v.summary.clubEstimatedClp));const cfg={...DEFAULT_COMMISSION_CONFIG,processingPayer:'codetec' as const};service.apply(cfg);cfg.codetecBps=0;expect(totals).toEqual([143676,148200]);const exported=service.config;exported.codetecBps=999;expect(service.config.codetecBps).toBe(500);expect(new AdminCommissionsService(sales).config).toEqual(DEFAULT_COMMISSION_CONFIG);subscription.unsubscribe();
 });
 it('does not mutate nested sales, send HTTP or change Wallet',async()=>{
  TestBed.configureTestingModule({imports:[HttpClientTestingModule]});const wallet=TestBed.inject(WalletService),before=JSON.stringify(await firstValueFrom(wallet.getWallet()));
  const report=await firstValueFrom(service.report(filters()));report.operations[0].sale.items[0].quantity=999;report.operations[0].sale.timeline[0].title='mutated';service.apply({...DEFAULT_COMMISSION_CONFIG,codetecBps:0});expect((await firstValueFrom(sales.getSales()))[4].items[0].quantity).toBe(1);expect(JSON.stringify(await firstValueFrom(wallet.getWallet()))).toBe(before);TestBed.inject(HttpTestingController).expectNone(()=>true);TestBed.inject(HttpTestingController).verify();
 });
});
