import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';
import { TYPE_LABELS } from './admin-sale.model';
import { AdminSalesService } from './admin-sales.service';
import { saleTotal, saleType, saleDate } from './admin-sales.logic';
@Component({selector:'app-admin-sale-detail',standalone:false,templateUrl:'./admin-sale-detail.component.html',styleUrls:['./admin-sale-detail.component.scss']})
export class AdminSaleDetailComponent {
 readonly total=saleTotal;readonly type=saleType;readonly date=saleDate;readonly typeLabels=TYPE_LABELS;
 readonly sale$=this.route.paramMap.pipe(switchMap(p=>this.sales.find(p.get('id')||'')));
 constructor(private route:ActivatedRoute,private sales:AdminSalesService){}
}
