import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { CLUB_CONFIG } from './club.config';
import { DEMO_DASHBOARD } from './admin.data';
import { AdminSalesService } from './sales/admin-sales.service';
import { selectSales, saleTotal, saleType } from './sales/admin-sales.logic';
@Injectable()
export class AdminDemoService {
 constructor(private readonly sales:AdminSalesService=new AdminSalesService(()=>new Date())){}
 readonly context$=this.sales.getSales().pipe(map(source=>{
  const selected=selectSales(source,{period:'today',from:'',to:'',search:'',type:'',payment:'',order:'date-desc'},this.sales.today),s=selected.summary,approved=selected.sales.filter(sale=>sale.paymentStatus==='approved');
  const units=new Map<string,{name:string;units:number;salesClp:number}>();for(const sale of approved)for(const item of sale.items.filter(i=>i.kind==='drink')){const old=units.get(item.name)||{name:item.name,units:0,salesClp:0};units.set(item.name,{name:item.name,units:old.units+item.quantity,salesClp:old.salesClp+item.quantity*item.unitPriceClp});}
  return {club:{...CLUB_CONFIG,logo:{...CLUB_CONFIG.logo},branding:{...CLUB_CONFIG.branding},settings:{...CLUB_CONFIG.settings}},dashboard:{...DEMO_DASHBOARD,period:'Hoy · '+this.sales.today,salesClp:s.totalSalesClp,orders:s.orders,tickets:s.ticketsSold,drinks:s.drinksSold,averageClp:s.averageTicketClp,recentSales:approved.slice(0,5).map(sale=>({id:sale.id,at:sale.createdAt,type:saleType(sale)==='ticket'?'Entrada':saleType(sale)==='drink'?'Tragos':'Mixto',totalClp:saleTotal(sale)})),products:[...units.values()].sort((a,b)=>b.units-a.units).map((p,i)=>({id:String(i),...p,image:DEMO_DASHBOARD.products.find(d=>d.name===p.name)?.image||'assets/drinks/piscola.jpg',share:s.drinksSold?Math.round(p.units*100/s.drinksSold):0})),events:DEMO_DASHBOARD.events.map(e=>({...e})),activity:DEMO_DASHBOARD.activity.map(a=>({...a}))}};
 }));
}
