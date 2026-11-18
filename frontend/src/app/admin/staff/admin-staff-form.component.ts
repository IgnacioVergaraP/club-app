import { Component, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AdminStaffArea, AdminStaffRole, AdminStaffStatus, STAFF_AREAS, STAFF_LIMITS, STAFF_ROLES } from './admin-staff.model';
import { staffEmailValidator, staffNameValidator, staffPhoneValidator } from './admin-staff.validation';
import { AdminStaffService } from './admin-staff.service';
@Component({selector:'app-admin-staff-form',standalone:false,templateUrl:'./admin-staff-form.component.html',styleUrls:['./admin-staff-form.component.scss']})
export class AdminStaffFormComponent implements OnDestroy {
 readonly roles=STAFF_ROLES;readonly areas=STAFF_AREAS;readonly limits=STAFF_LIMITS;readonly form;
 id?:string;missing=false;saving=false;error='';notice='';private baseline='';private readonly destroy$=new Subject<void>();
 constructor(private service:AdminStaffService,private route:ActivatedRoute,private router:Router,private element:ElementRef<HTMLElement>){
  this.form=new FormGroup({name:new FormControl('',{nonNullable:true,validators:[staffNameValidator]}),email:new FormControl('',{nonNullable:true,validators:[staffEmailValidator,c=>typeof c.value==='string'&&this.service.emailExists(c.value,this.id)?{duplicate:true}:null]}),phone:new FormControl('',{nonNullable:true,validators:[staffPhoneValidator]}),role:new FormControl<AdminStaffRole|''>('',{nonNullable:true,validators:[c=>STAFF_ROLES.some(r=>r.value===c.value)?null:{role:true}]}),area:new FormControl<AdminStaffArea|''>('',{nonNullable:true,validators:[c=>STAFF_AREAS.some(a=>a.value===c.value)?null:{area:true}]}),status:new FormControl<AdminStaffStatus>('active',{nonNullable:true,validators:[c=>['active','inactive'].includes(c.value)?null:{status:true}]})});
  route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params=>{
   this.id=params.get('id')||undefined;this.missing=false;this.error='';this.notice='';this.form.reset({name:'',email:'',phone:'',role:'',area:'',status:'active'},{emitEvent:false});
   if(this.id){const worker=service.get(this.id);if(worker)this.form.patchValue(worker,{emitEvent:false});else this.missing=true;}
   this.form.controls.email.updateValueAndValidity({emitEvent:false});this.form.markAsPristine();this.baseline=this.signature();
  });
  service.staff$.pipe(takeUntil(this.destroy$)).subscribe(()=>this.form.controls.email.updateValueAndValidity({emitEvent:false}));
  this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(()=>{this.error='';this.notice='';});
 }
 get hasUnsavedChanges():boolean{return !this.missing&&this.baseline!==this.signature();}
 invalid(name:keyof typeof this.form.controls):boolean{const c=this.form.controls[name];return c.invalid&&c.touched;}
 save():void {
  if(this.saving||this.missing)return;this.form.markAllAsTouched();this.error='';this.notice='';
  if(this.form.invalid){this.error='Revisa los campos marcados antes de guardar el trabajador .';const field=Object.keys(this.form.controls).find(k=>this.form.get(k)?.invalid);if(field)this.element.nativeElement.querySelector<HTMLInputElement>('[formControlName="'+field+'"]')?.focus();return;}
  const value=this.form.getRawValue(),current=this.id?this.service.get(this.id):undefined;
  const disabling=current?.status==='active'&&value.status==='inactive';
  if(disabling&&!window.confirm(`¿Desactivar a ${current!.name} en esta demostración? No se revoca ningún acceso real.`)){this.notice='Desactivación cancelada. No se guardaron los cambios.';return;}
  try{this.saving=true;const saved=this.service.save({...value,role:value.role as AdminStaffRole,area:value.area as AdminStaffArea},this.id,disabling);this.id=saved.id;this.form.controls.email.updateValueAndValidity({emitEvent:false});this.baseline=this.signature();this.form.markAsPristine();void this.router.navigate(['/admin/personal'],{queryParamsHandling:'merge',queryParams:{worker:saved.id}}).finally(()=>this.saving=false);}
  catch(error){this.saving=false;this.error=(error as Error).message;this.form.controls.email.updateValueAndValidity({emitEvent:false});}
 }
 confirmLeave():boolean{return !this.hasUnsavedChanges||window.confirm('Tienes cambios del trabajador sin guardar. ¿Quieres salir y descartarlos?');}
 @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent):void{if(this.hasUnsavedChanges){event.preventDefault();event.returnValue='';}}
 ngOnDestroy():void{this.destroy$.next();this.destroy$.complete();}
 private signature():string{return JSON.stringify(this.form.getRawValue());}
}
