import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { AdminSalesService } from '../sales/admin-sales.service';
import { selectSales } from '../sales/admin-sales.logic';
import { AdminCommissionConfig, AdminCommissionFilters, AdminCommissionReport, DEFAULT_COMMISSION_CONFIG } from './admin-commission.model';
import { calculateCommission, summarizeCommissions, validCommissionConfig } from './admin-commission.logic';
@Injectable()
export class AdminCommissionsService {
 private readonly state=new BehaviorSubject<AdminCommissionConfig>({...DEFAULT_COMMISSION_CONFIG});
 readonly config$=this.state.asObservable().pipe(map(value=>({...value})));
 get config():AdminCommissionConfig{return {...this.state.value};}
 get today():string{return this.sales.today;}
 constructor(private sales:AdminSalesService){}
 apply(config:AdminCommissionConfig):void {if(!validCommissionConfig(config))throw new Error('Revisa los parámetros de revisión.');this.state.next({...config});}
 report(filters:AdminCommissionFilters):Observable<AdminCommissionReport>{
  return combineLatest([this.sales.getSales(),this.config$]).pipe(map(([sales,config])=>{
   const selection=selectSales(sales,{...filters,type:''},this.today);
   const operations=selection.sales.map(sale=>calculateCommission(sale,config));
   return {operations,summary:summarizeCommissions(operations),config,from:selection.from,to:selection.to,error:selection.error};
  }));
 }
}
