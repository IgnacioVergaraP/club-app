import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { DEMO_STAFF } from './admin-staff.data';
import { AdminStaff, AdminStaffDraft, AdminStaffStatus } from './admin-staff.model';
import { normalizeStaffDraft, normalizeStaffEmail } from './admin-staff.validation';
@Injectable({providedIn:'root'})
export class AdminStaffService {
 private readonly state=new BehaviorSubject<AdminStaff[]>(DEMO_STAFF.map(w=>({...w})));
 private readonly feedback=new BehaviorSubject('');private nextId=9;
 readonly staff$=this.state.asObservable().pipe(map(workers=>workers.map(w=>({...w}))));
 readonly message$=this.feedback.asObservable();
 get(id:string):AdminStaff|undefined{const worker=this.state.value.find(w=>w.id===id);return worker?{...worker}:undefined;}
 emailExists(email:string,exceptId?:string):boolean{const key=normalizeStaffEmail(email);return this.state.value.some(w=>w.id!==exceptId&&w.email===key);}
 save(input:AdminStaffDraft,id?:string,deactivationConfirmed=false):AdminStaff {
  const value=normalizeStaffDraft(input),current=id?this.get(id):undefined;
  if(id&&!current)throw new Error('Trabajador no disponible en esta Revisión.');
  if(this.emailExists(value.email,id))throw new Error('Ya existe un trabajador  con ese correo, incluso si está inactivo.');
  if(current?.status==='active'&&value.status==='inactive'&&!deactivationConfirmed)throw new Error('Confirma la desactivación antes de guardar.');
  const saved:AdminStaff={...value,id:current?.id||'DEMO-EMP-'+String(this.nextId++).padStart(3,'0'),isDemo:true};
  this.state.next(current?this.state.value.map(w=>w.id===saved.id?saved:w):[...this.state.value,saved]);
  this.feedback.next(current?`${saved.name}: cambios guardados en la.`:`${saved.name}: trabajador agregado a la.`);return {...saved};
 }
 setStatus(id:string,status:AdminStaffStatus,confirmed=false):AdminStaff {const worker=this.get(id);if(!worker)throw new Error('Trabajador no disponible en esta Revisión.');const saved=this.save({...worker,status},id,confirmed);this.feedback.next(`${saved.name}: ${status==='active'?'activado':'desactivado'} en la. Sin cambios de acceso real.`);return saved;}
 cancelDeactivation():void{this.feedback.next('Desactivación cancelada. No se modificó el trabajador.');}
}
