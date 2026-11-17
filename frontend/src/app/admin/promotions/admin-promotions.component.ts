import { Component, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map, startWith } from 'rxjs';
import { AdminPromotionsService } from './admin-promotions.service';
import { DemoNotice, NoticePreview, NOTICE_KINDS, NOTICE_LABELS, Promotion, PROMOTION_LABELS } from './promotion.model';
import { AUDIENCES, audienceLabel, formatPromotionTime, inPeriod, periodRange, scheduleLabel } from './promotion.rules';
const tabs=['promotions','notifications','history'] as const;
const searchText=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
@Component({selector:'app-admin-promotions',standalone:false,templateUrl:'./admin-promotions.component.html',styleUrls:['./promotions.shared.scss','./admin-promotions.component.scss']})
export class AdminPromotionsComponent {
 readonly service=inject(AdminPromotionsService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);
 readonly tabs=tabs;readonly titles=['Promociones','Notificaciones','Historial'];readonly promotionLabels=PROMOTION_LABELS;readonly noticeLabels=NOTICE_LABELS;readonly kinds=NOTICE_KINDS;readonly audiences=AUDIENCES;readonly audienceLabel=audienceLabel;readonly formatDate=formatPromotionTime;readonly scheduleLabel=scheduleLabel;
 error='';readonly filters=new FormGroup({search:new FormControl('',{nonNullable:true}),status:new FormControl('',{nonNullable:true}),product:new FormControl('',{nonNullable:true}),period:new FormControl('all',{nonNullable:true}),from:new FormControl('',{nonNullable:true}),to:new FormControl('',{nonNullable:true}),type:new FormControl('',{nonNullable:true}),audience:new FormControl('',{nonNullable:true})});
 readonly vm$=combineLatest([this.service.view$,this.route.queryParamMap,this.filters.valueChanges.pipe(startWith(null))]).pipe(map(([data,params])=>{
  const view=tabs.find(v=>v===params.get('view'))||'promotions',f=this.filters.getRawValue(),q=searchText(f.search),range=periodRange(f.period,data.now,f.from,f.to);
  return {...data,view,range,items:data.promotions.filter(p=>(!f.status||p.status===f.status)&&(!f.product||p.productId===f.product)&&searchText(p.name+' '+p.productName+' '+p.id).includes(q)&&inPeriod(p.startAt,p.endAt,range)),messages:data.notices.filter(n=>(!f.status||n.state===f.status)&&(!f.type||n.kind===f.type)&&(!f.audience||n.audience===f.audience)&&searchText(n.title+' '+n.message+' '+n.id).includes(q)&&inPeriod(n.scheduledAt,n.scheduledAt,range)),events:data.history.filter(h=>(!f.type||h.type===f.type)&&(!f.audience||h.audience===f.audience)&&searchText(h.reference+' '+h.action+' '+h.detail).includes(q)&&inPeriod(h.at,h.at,range)).slice().reverse(),selectedPromotion:data.promotions.find(p=>p.id===params.get('selection')),selectedNotice:data.notices.find(n=>n.id===params.get('selection'))};
 }));
 trackRecord(_:number,r:{id:string}){return r.id;}
 reset(){this.filters.reset({search:'',status:'',product:'',period:'all',from:'',to:'',type:'',audience:''});}
 chooseTab(view:string){this.reset();this.error='';void this.router.navigate([],{relativeTo:this.route,queryParams:{view}});}
 key(event:KeyboardEvent,index:number){let next=index;if(event.key==='ArrowRight')next=(index+1)%3;else if(event.key==='ArrowLeft')next=(index+2)%3;else if(event.key==='Home')next=0;else if(event.key==='End')next=2;else return;event.preventDefault();this.chooseTab(tabs[next]);document.getElementById('promotion-tab-'+tabs[next])?.focus();}
 select(id:string|null,view:string){void this.router.navigate([],{relativeTo:this.route,queryParams:{view,selection:id}});}
 duplicate(id:string){this.error='';try{this.service.duplicate(id).subscribe({next:copy=>void this.router.navigate(['/admin/promociones',copy,'editar']),error:e=>this.error=e.message});}catch(e){this.error=(e as Error).message;}}
 cancelPromotion(id:string){if(window.confirm('¿Cancelar esta promoción y su aviso pendiente en la DEMO?'))this.run(()=>this.service.cancelPromotion(id));}
 cancelNotice(id:string){if(window.confirm('¿Cancelar este aviso DEMO? No se realizará ningún envío.'))this.run(()=>this.service.cancelNotice(id));}
 finish(id:string){this.run(()=>this.service.finishSimulation(id));}
 private run(action:()=>void){this.error='';try{action();}catch(e){this.error=(e as Error).message;}}
 promotionPreview(p:Promotion):NoticePreview{return {title:p.noticeTitle||p.name,message:p.noticeMessage||p.description,productName:p.productName,priceClp:p.promoPriceClp,schedule:p.modality==='instant'&&p.mode==='draft'?`Se activará al publicar · ${p.durationMinutes||'Duración pendiente'} min`:scheduleLabel(p.startAt,p.endAt),audience:p.audience};}
 noticePreview(n:DemoNotice):NoticePreview{return {title:n.title,message:n.message,productName:n.productName,priceClp:n.offer?.promoPriceClp??null,schedule:n.offer?scheduleLabel(n.offer.startAt,n.offer.endAt):scheduleLabel(n.scheduledAt),audience:n.audience};}
 kindLabel(kind:string){return this.kinds.find(k=>k.value===kind)?.label||kind;}
 historyState(type:string,state:string){return ((type==='promotion'?this.promotionLabels:this.noticeLabels) as Record<string,string>)[state]||state;}
}
