import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminStaff, STAFF_AREAS, STAFF_ROLES } from './admin-staff.model';
import { staffInitials } from './admin-staff.validation';
import { AdminStaffService } from './admin-staff.service';
@Component({selector:'app-admin-staff-detail',standalone:false,templateUrl:'./admin-staff-detail.component.html',styleUrls:['./admin-staff-detail.component.scss']})
export class AdminStaffDetailComponent {
 @Input({required:true}) worker!:AdminStaff;@Output() closePanel=new EventEmitter<void>();
 readonly initials=staffInitials;error='';
 constructor(private service:AdminStaffService){}
 get role(){return STAFF_ROLES.find(r=>r.value===this.worker.role);}
 get area():string{return STAFF_AREAS.find(a=>a.value===this.worker.area)?.label||'';}
 toggleStatus():void{
  this.error='';const current=this.service.get(this.worker.id);if(!current){this.error='El trabajador ya no está disponible.';return;}
  const disabling=current.status==='active';
  if(disabling&&!window.confirm(`¿Desactivar a ${current.name} en esta demostración? No se revoca ningún acceso real.`)){this.service.cancelDeactivation();return;}
  try{this.service.setStatus(current.id,disabling?'inactive':'active',disabling);}catch(error){this.error=(error as Error).message;}
 }
}
