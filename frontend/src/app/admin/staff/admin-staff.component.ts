import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map, startWith, switchMap, tap } from 'rxjs';
import { AdminStaffFilters, STAFF_ROLES } from './admin-staff.model';
import { filterStaff, staffSummary } from './admin-staff.validation';
import { AdminStaffService } from './admin-staff.service';
@Component({selector:'app-admin-staff',standalone:false,templateUrl:'./admin-staff.component.html',styleUrls:['./admin-staff.component.scss']})
export class AdminStaffComponent {
 readonly roles=STAFF_ROLES;readonly form;readonly view$;readonly message$;
 selectedId:string|null=null;selectionNotice='';
 constructor(readonly service:AdminStaffService,private route:ActivatedRoute,private router:Router){
  const q=route.snapshot.queryParamMap,pick=(key:string,values:string[],fallback:string)=>values.includes(q.get(key)||'')?q.get(key)!:fallback;
  const initial:AdminStaffFilters={search:(q.get('search')||'').slice(0,100),role:pick('role',STAFF_ROLES.map(r=>r.value),'') as AdminStaffFilters['role'],status:pick('status',['active','inactive'],'') as AdminStaffFilters['status'],order:pick('order',['name','name-desc'],'name') as AdminStaffFilters['order']};
  this.selectedId=q.get('worker');this.message$=service.message$;
  this.form=new FormGroup({search:new FormControl(initial.search,{nonNullable:true}),role:new FormControl(initial.role,{nonNullable:true}),status:new FormControl(initial.status,{nonNullable:true}),order:new FormControl(initial.order,{nonNullable:true})});
  this.view$=this.form.valueChanges.pipe(startWith(initial),tap(()=>this.updateUrl()),switchMap(()=>service.staff$),map(records=>{
   const workers=filterStaff(records,this.form.getRawValue());this.selectionNotice='';
   if(this.selectedId&&!workers.some(w=>w.id===this.selectedId)){if(!records.some(w=>w.id===this.selectedId))this.selectionNotice='El trabajador solicitado no está disponible en esta . Una recarga elimina los registros nuevos.';const focusWasInDetail=!!document.activeElement?.closest('app-admin-staff-detail');this.selectedId=null;if(focusWasInDetail)requestAnimationFrame(()=>document.getElementById('staff-search')?.focus());}
   return {workers,summary:staffSummary(workers),total:records.length,selected:workers.find(w=>w.id===this.selectedId)};
  }));
 }
 clear():void{this.form.reset({search:'',role:'',status:'',order:'name'});}
 select(id:string|null):void{
  const previous=this.selectedId;this.selectedId=id;this.updateUrl();
  if(!id&&previous)requestAnimationFrame(()=>{Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-worker]')).find(b=>b.dataset['worker']===previous&&b.getClientRects().length)?.focus();});
 }
 private updateUrl():void {const f=this.form.getRawValue();void this.router.navigate([],{relativeTo:this.route,replaceUrl:true,queryParams:{search:f.search||null,role:f.role||null,status:f.status||null,order:f.order,worker:this.selectedId}});}
}
