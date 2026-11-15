import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { startWith, switchMap, tap } from 'rxjs';
import { AdminSalesPeriod, AdminSalesFilters, PAYMENT_LABELS, TYPE_LABELS } from './admin-sale.model';
import { AdminSalesService } from './admin-sales.service';
import { saleDate, saleTotal, saleType } from './admin-sales.logic';
@Component({selector:'app-admin-sales',standalone:false,templateUrl:'./admin-sales.component.html',styleUrls:['./admin-sales.component.scss']})
export class AdminSalesComponent {
 readonly payments=Object.entries(PAYMENT_LABELS); readonly types=Object.entries(TYPE_LABELS);
 readonly total=saleTotal; readonly type=saleType; readonly date=saleDate; readonly typeLabels=TYPE_LABELS;
 readonly form:FormGroup<{[K in keyof AdminSalesFilters]:FormControl<AdminSalesFilters[K]>}>;
 readonly view$;
 selectedId:string|null=null;
 readonly periods: {value:AdminSalesPeriod;label:string}[]=[{value:'today',label:'Hoy'},{value:'yesterday',label:'Ayer'},{value:'week',label:'Últimos 7 días'},{value:'custom',label:'Personalizado'}];
 setPeriod(value:AdminSalesPeriod):void{this.form.controls.period.setValue(value);}

 constructor(readonly sales:AdminSalesService,route:ActivatedRoute,router:Router){
   const q=route.snapshot.queryParamMap; const pick=(key:string,values:string[],fallback:string)=>values.includes(q.get(key)||'')?q.get(key)!:fallback;
   const initial:AdminSalesFilters={period:pick('period',['today','yesterday','week','custom'],'today') as AdminSalesFilters['period'],from:q.get('from')||sales.today,to:q.get('to')||sales.today,search:(q.get('search')||'').slice(0,80),type:pick('type',['ticket','drink','mixed'],'') as AdminSalesFilters['type'],payment:pick('payment',Object.keys(PAYMENT_LABELS),'') as AdminSalesFilters['payment'],order:pick('order',['date-desc','date-asc','amount-desc','amount-asc'],'date-desc') as AdminSalesFilters['order']};
   this.form=new FormGroup({period:new FormControl(initial.period,{nonNullable:true}),from:new FormControl(initial.from,{nonNullable:true}),to:new FormControl(initial.to,{nonNullable:true}),search:new FormControl(initial.search,{nonNullable:true}),type:new FormControl(initial.type,{nonNullable:true}),payment:new FormControl(initial.payment,{nonNullable:true}),order:new FormControl(initial.order,{nonNullable:true})});
   this.view$=this.form.valueChanges.pipe(startWith(initial),tap(()=>{this.selectedId=null;const f=this.form.getRawValue();void router.navigate([],{relativeTo:route,queryParams:{period:f.period,from:f.period==='custom'?f.from:null,to:f.period==='custom'?f.to:null,search:f.search||null,type:f.type||null,payment:f.payment||null,order:f.order},replaceUrl:true});}),switchMap(()=>sales.query(this.form.getRawValue())));
 }
 clearFilters():void {this.form.reset({period:'today',from:this.sales.today,to:this.sales.today,search:'',type:'',payment:'',order:'date-desc'});}
 trackSale(_:number,sale:{id:string}):string{return sale.id;}
}
