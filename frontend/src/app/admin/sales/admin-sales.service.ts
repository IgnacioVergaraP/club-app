import { Inject, Injectable, InjectionToken } from '@angular/core';
import { defer, map, Observable, of } from 'rxjs';
import { AdminSale, AdminSalesFilters, AdminSalesView } from './admin-sale.model';
import { createDemoSales } from './admin-sales.data';
import { saleDay, selectSales } from './admin-sales.logic';
export const ADMIN_SALES_CLOCK=new InjectionToken<()=>Date>('ADMIN_SALES_CLOCK',{providedIn:'root',factory:()=>()=>new Date()});
@Injectable()
export class AdminSalesService {
  readonly today: string;
  private readonly source: AdminSale[];
  constructor(@Inject(ADMIN_SALES_CLOCK) clock:()=>Date) {this.today=saleDay(clock());this.source=createDemoSales(this.today);}
  getSales():Observable<AdminSale[]> { return defer(()=>of(this.source.map(s=>({...s,items:s.items.map(i=>({...i})),timeline:s.timeline.map(t=>({...t}))})))); }
  query(filters:AdminSalesFilters):Observable<AdminSalesView> {return this.getSales().pipe(map(s=>selectSales(s,filters,this.today)));}
  find(id:string):Observable<AdminSale|undefined> {return this.getSales().pipe(map(s=>s.find(item=>item.id===id)));}
}
