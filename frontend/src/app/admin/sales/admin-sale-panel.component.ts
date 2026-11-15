import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminSale, TYPE_LABELS } from './admin-sale.model';
import { saleDate, saleTotal, saleType } from './admin-sales.logic';
@Component({selector:'app-admin-sale-panel',standalone:false,templateUrl:'./admin-sale-panel.component.html',styleUrls:['./admin-sale-panel.component.scss']})
export class AdminSalePanelComponent {
 @Input({required:true}) sale!:AdminSale;
 @Input() closable=false;
 @Output() closePanel=new EventEmitter<void>();
 readonly total=saleTotal;readonly type=saleType;readonly date=saleDate;readonly labels=TYPE_LABELS;
}
