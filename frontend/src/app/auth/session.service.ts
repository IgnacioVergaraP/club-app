import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, map, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminStaffService } from '../admin/staff/admin-staff.service';
import { AuthProvider, SessionState, SessionUser, ROLE_DESTINATIONS } from './session.model';
@Injectable({providedIn:'root'})
export class UnconfiguredAuthProvider extends AuthProvider {
 signIn(){return timer(200).pipe(map(()=>({status:'unavailable' as const,message:'El acceso con contraseña todavía no está habilitado. Puedes revisar los perfiles disponibles.'})));}
 register(){return timer(200).pipe(map(()=>({status:'unavailable' as const,message:'El registro todavía no está habilitado. No se creó una cuenta ni se verificó el correo.'})));}
 recover(){return timer(200).pipe(map(()=>({status:'unavailable' as const,message:'La recuperación todavía no está habilitada. No se envió ningún correo.'})));}
}
@Injectable({providedIn:'root'})
export class SessionService {
 private readonly staff=inject(AdminStaffService);
 private readonly state=new BehaviorSubject<SessionState>({status:'anonymous',authenticated:false,user:null,error:'',source:null});
 readonly state$=this.state.asObservable();readonly labels=ROLE_DESTINATIONS;
 readonly profiles$=this.staff.staff$.pipe(map(workers=>[{id:'review-client',name:'Alex',email:'alex@example.com',role:'client' as const},...workers.filter(w=>w.status==='active').map(w=>({id:w.id,name:w.name,email:w.email,phone:w.phone,role:w.role}))]));
 get current(){return this.state.value;}
 constructor(){this.staff.staff$.pipe(takeUntilDestroyed()).subscribe(workers=>{const user=this.current.user;if(!user||user.role==='client')return;const worker=workers.find(w=>w.id===user.id&&w.status==='active');if(!worker){this.signOut();return;}this.state.next({...this.current,user:{id:worker.id,name:worker.name,email:worker.email,phone:worker.phone,role:worker.role}});});}
 selectReview(id:string):string {const w=id==='review-client'?{id,name:'Alex',email:'alex@example.com',role:'client' as const}:this.staff.get(id);if(!w||('status'in w&&w.status!=='active'))throw Error('Este perfil no está disponible.');const user:SessionUser={id:w.id,name:w.name,email:w.email,role:w.role,...('phone'in w?{phone:w.phone}:{})};this.state.next({status:'review',authenticated:false,user,error:'',source:'local-review'});return ROLE_DESTINATIONS[user.role];}
 updateClient(name:string,phone?:string){if(this.current.user?.role==='client')this.state.next({...this.current,user:{...this.current.user,name,phone}});}
 beginAccess(){this.state.next({status:'loading',authenticated:false,user:null,error:'',source:null});}
 accessError(error:string){this.state.next({status:'error',authenticated:false,user:null,error,source:null});}
 signOut(){this.state.next({status:'anonymous',authenticated:false,user:null,error:'',source:null});}
}
@Injectable({providedIn:'root'})
export class ReviewToolsService {enabled=false;}
