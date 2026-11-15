import { Component, Input } from '@angular/core';
import { AdminCommissionConfig, AdminFinancialOperation } from './admin-commission.model';
import { saleDate, saleType } from '../sales/admin-sales.logic';
import { TYPE_LABELS } from '../sales/admin-sale.model';
@Component({selector:'app-admin-commission-detail',standalone:false,templateUrl:'./admin-commission-detail.component.html',styleUrls:['./admin-commission-detail.component.scss']})
export class AdminCommissionDetailComponent {
 @Input({required:true}) operation!:AdminFinancialOperation;@Input({required:true}) config!:AdminCommissionConfig;
 readonly date=saleDate;readonly type=saleType;readonly labels=TYPE_LABELS;
}
