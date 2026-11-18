import { Component, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map, startWith } from 'rxjs';
import { AdminPromotionsService } from './admin-promotions.service';
import { NoticePreview, NOTICE_LABELS, Promotion, PROMOTION_LABELS } from './promotion.model';
import { AUDIENCES, audienceLabel, formatPromotionTime, inPeriod, localFields, periodRange, scheduleLabel } from './promotion.rules';
const tabs=['promotions','history'] as const;
const searchText=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
@Component({selector:'app-admin-promotions',standalone:false,templateUrl:'./admin-promotions.component.html',styleUrls:['./promotions.shared.scss','./admin-promotions.component.scss']})
export class AdminPromotionsComponent {
 readonly service=inject(AdminPromotionsService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);
 readonly tabs=tabs;readonly titles=['Promociones','Historial'];readonly promotionLabels=PROMOTION_LABELS;readonly noticeLabels=NOTICE_LABELS;readonly audiences=AUDIENCES;readonly audienceLabel=audienceLabel;readonly formatDate=formatPromotionTime;readonly scheduleLabel=scheduleLabel;
 error='';readonly filters=new FormGroup({search:new FormControl('',{nonNullable:true}),period:new FormControl('all',{nonNullable:true}),from:new FormControl('',{nonNullable:true}),to:new FormControl('',{nonNullable:true}),type:new FormControl('',{nonNullable:true}),audience:new FormControl('',{nonNullable:true})});
 readonly vm$=combineLatest([this.service.view$,this.route.queryParamMap,this.filters.valueChanges.pipe(startWith(null))]).pipe(map(([data,params])=>{
  const view=tabs.find(v=>v===params.get('view'))||'promotions',f=this.filters.getRawValue(),q=searchText(f.search),range=periodRange(view==='history'?f.period:'all',data.now,f.from,f.to);
  return {...data,view,range,items:data.promotions,events:data.history.filter(h=>(!f.type||h.type===f.type)&&(!f.audience||h.audience===f.audience)&&searchText(h.reference+' '+h.action+' '+h.detail).includes(q)&&inPeriod(h.at,h.at,range)).slice().reverse(),selectedPromotion:data.promotions.find(p=>p.id===params.get('selection'))};
 }));
 trackRecord(_:number,r:{id:string}){return r.id;}
 reset(){this.filters.reset({search:'',period:'all',from:'',to:'',type:'',audience:''});}
 chooseTab(view:string){this.reset();this.error='';void this.router.navigate([],{relativeTo:this.route,queryParams:{view}});}
 key(event:KeyboardEvent,index:number){let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();this.chooseTab(tabs[next]);document.getElementById('promotion-tab-'+tabs[next])?.focus();}
 select(id:string|null,view:string){void this.router.navigate([],{relativeTo:this.route,queryParams:{view,selection:id}});}
 duplicate(id:string){this.error='';try{this.service.duplicate(id).subscribe({next:copy=>void this.router.navigate(['/admin/promociones',copy,'editar']),error:e=>this.error=e.message});}catch(e){this.error=(e as Error).message;}}
 cancelPromotion(id:string){if(window.confirm('¿Cancelar esta promoción y su aviso pendiente?'))this.run(()=>this.service.cancelPromotion(id));}
 private run(action:()=>void){this.error='';try{action();}catch(e){this.error=(e as Error).message;}}
 promotionPreview(p:Promotion):NoticePreview{return {title:p.noticeTitle||p.name,message:p.noticeMessage||p.description,productName:p.productName,priceClp:p.promoPriceClp,schedule:p.modality==='instant'&&p.mode==='draft'?`Se activará al publicar · ${p.durationMinutes||'Duración pendiente'} min`:scheduleLabel(p.startAt,p.endAt),audience:p.audience};}
 cardSchedule(p:Promotion):string {
  if(p.modality==='instant'&&p.mode==='draft')return `Al publicar · ${p.durationMinutes||'Duración pendiente'} min`;
  if(p.startAt===null||p.endAt===null)return 'Horario por definir';
  const start=localFields(p.startAt),end=localFields(p.endAt);
  return start.date===end.date ? `${this.formatDate(p.startAt)} – ${end.time}` : `${this.formatDate(p.startAt)} – ${this.formatDate(p.endAt)}`;
 }
 historyState(type:string,state:string){return ((type==='promotion'?this.promotionLabels:this.noticeLabels) as Record<string,string>)[state]||state;}
}
