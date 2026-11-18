import { DOCUMENT } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { startWith, switchMap, tap } from 'rxjs';
import { AdminCommissionsService } from './admin-commissions.service';
import { AdminCommissionFilters, AdminCommissionReport } from './admin-commission.model';
import { PAYMENT_LABELS } from '../sales/admin-sale.model';
import { commissionCsv } from './admin-commission.csv';
@Component({selector:'app-admin-commissions',standalone:false,templateUrl:'./admin-commissions.component.html',styleUrls:['./admin-commissions.component.scss']})
export class AdminCommissionsComponent {
 readonly payments=Object.entries(PAYMENT_LABELS);readonly periods=[{value:'today' as const,label:'Hoy'},{value:'yesterday' as const,label:'Ayer'},{value:'week' as const,label:'Últimos 7 días'},{value:'custom' as const,label:'Personalizado'}];
 readonly form;readonly report$;exportMessage='';
 constructor(readonly service:AdminCommissionsService,route:ActivatedRoute,router:Router,@Inject(DOCUMENT) private document:Document){
  const q=route.snapshot.queryParamMap,pick=(key:string,values:string[],fallback:string)=>values.includes(q.get(key)||'')?q.get(key)!:fallback;
  const initial:AdminCommissionFilters={period:pick('period',['today','yesterday','week','custom'],'week') as AdminCommissionFilters['period'],from:q.get('from')||service.today,to:q.get('to')||service.today,search:(q.get('search')||'').slice(0,80),payment:pick('payment',Object.keys(PAYMENT_LABELS),'') as AdminCommissionFilters['payment'],order:pick('order',['date-desc','date-asc','amount-desc','amount-asc'],'date-desc') as AdminCommissionFilters['order']};
  this.form=new FormGroup({period:new FormControl(initial.period,{nonNullable:true}),from:new FormControl(initial.from,{nonNullable:true}),to:new FormControl(initial.to,{nonNullable:true}),search:new FormControl(initial.search,{nonNullable:true}),payment:new FormControl(initial.payment,{nonNullable:true}),order:new FormControl(initial.order,{nonNullable:true})});
  this.report$=this.form.valueChanges.pipe(startWith(initial),tap(()=>{this.exportMessage='';const f=this.form.getRawValue();void router.navigate([],{relativeTo:route,replaceUrl:true,queryParams:{period:f.period,from:f.period==='custom'?f.from:null,to:f.period==='custom'?f.to:null,search:f.search||null,payment:f.payment||null,order:f.order}});}),switchMap(()=>service.report(this.form.getRawValue())));
 }
 clear():void{this.form.reset({period:'week',from:this.service.today,to:this.service.today,search:'',payment:'',order:'date-desc'});}
 export(report:AdminCommissionReport):void{
  if(report.error||!report.operations.length)return;
  const blob=new Blob([commissionCsv(report)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=this.document.createElement('a');
  a.href=url;a.download='void-comisiones-DEMO-'+report.from+'-'+report.to+'.csv';this.document.body.appendChild(a);
  try{a.click();this.exportMessage='CSV  exportado: toda la selección, sin carácter tributario ni conciliación oficial.';}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 }
}
