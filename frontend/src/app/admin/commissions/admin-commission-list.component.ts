import { Component, Input, OnChanges } from '@angular/core';
import { AdminCommissionConfig, AdminFinancialOperation } from './admin-commission.model';
import { saleShortDate, saleType } from '../sales/admin-sales.logic';
import { TYPE_LABELS } from '../sales/admin-sale.model';
@Component({selector:'app-admin-commission-list',standalone:false,templateUrl:'./admin-commission-list.component.html',styleUrls:['./admin-commission-list.component.scss']})
export class AdminCommissionListComponent implements OnChanges {
 @Input() operations:AdminFinancialOperation[]=[];@Input({required:true}) config!:AdminCommissionConfig;
 selectedId:string|null=null;page=1;readonly pageSize=5;
 readonly date=saleShortDate;readonly type=saleType;readonly labels=TYPE_LABELS;
 get pages():number{return Math.max(1,Math.ceil(this.operations.length/this.pageSize));}
 get visible():AdminFinancialOperation[]{return this.operations.slice((this.page-1)*this.pageSize,this.page*this.pageSize);}
 get first():number{return this.operations.length?(this.page-1)*this.pageSize+1:0;}
 get last():number{return Math.min(this.page*this.pageSize,this.operations.length);}
 ngOnChanges():void{this.page=1;this.selectedId=null;}
 toggle(id:string):void{this.selectedId=this.selectedId===id?null:id;}
 go(delta:number):void{this.page=Math.min(this.pages,Math.max(1,this.page+delta));this.selectedId=null;}
 track(_:number,o:AdminFinancialOperation):string{return o.sale.id;}
}
