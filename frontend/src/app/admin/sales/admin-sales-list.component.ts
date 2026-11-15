import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminSale, TYPE_LABELS } from './admin-sale.model';
import { saleTotal, saleType, saleShortDate } from './admin-sales.logic';
@Component({selector:'app-admin-sales-list',standalone:false,templateUrl:'./admin-sales-list.component.html',styleUrls:['./admin-sales-list.component.scss']})
export class AdminSalesListComponent {
 @Input() sales:AdminSale[]=[];
 @Input() selectedId:string|null=null;
 @Output() selectionChange=new EventEmitter<string|null>();
 readonly total=saleTotal;readonly type=saleType;readonly date=saleShortDate;readonly labels=TYPE_LABELS;
 get selected():AdminSale|undefined{return this.sales.find(s=>s.id===this.selectedId);}
 toggle(id:string):void{this.selectionChange.emit(this.selectedId===id?null:id);}
 close():void{const id=this.selectedId;this.selectionChange.emit(null);if(id)requestAnimationFrame(()=>{const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-order="'+id+'"]'));buttons.find(b=>b.getClientRects().length)?.focus();});}
 products(s:AdminSale):string{return s.items.map(i=>i.name.replace('VOID Sessions · ','Entrada ')+' ×'+i.quantity).join(' + ');}
 icon(s:AdminSale):string{return this.type(s)==='drink'?'drink':this.type(s)==='ticket'?'ticket':'receipt';}
 trackSale(_:number,s:AdminSale):string{return s.id;}
}
