import { AbstractControl, FormControl, Validators } from '@angular/forms';
import { AdminStaff, AdminStaffDraft, AdminStaffFilters, AdminStaffSummary, STAFF_AREAS, STAFF_LIMITS, STAFF_ROLES } from './admin-staff.model';
export const normalizeStaffEmail=(value:string):string=>value.trim().toLowerCase();
export function validStaffEmail(value:unknown):boolean{return typeof value==='string'&&!!value&&value.length<=STAFF_LIMITS.email&&Validators.email(new FormControl(value))===null;}
export function validStaffPhone(value:unknown):boolean {
 if(typeof value!=='string')return false;const phone=value.trim();if(!phone)return true;
 const digits=phone.replace(/\D/g,'');return phone.length<=STAFF_LIMITS.phone&&/^\+?[\d ()-]+$/.test(phone)&&digits.length>=8&&digits.length<=15;
}
export function staffNameValidator(control:AbstractControl){return typeof control.value==='string'&&!!control.value.trim()&&control.value.length<=STAFF_LIMITS.name?null:{name:true};}
export function staffEmailValidator(control:AbstractControl){return validStaffEmail(typeof control.value==='string'?control.value.trim():'')?null:{email:true};}
export function staffPhoneValidator(control:AbstractControl){return validStaffPhone(control.value)?null:{phone:true};}
export function normalizeStaffDraft(input:AdminStaffDraft):AdminStaffDraft {
 if(!input||![input.name,input.email,input.phone].every(v=>typeof v==='string'))throw new Error('Revisa los datos del trabajador DEMO.');
 const value:AdminStaffDraft={name:input.name.trim().replace(/\s+/g,' ').normalize('NFC'),email:normalizeStaffEmail(input.email),phone:input.phone.trim().replace(/\s+/g,' '),role:input.role,area:input.area,status:input.status};
 if(!value.name||value.name.length>STAFF_LIMITS.name)throw new Error('El nombre es obligatorio y admite hasta 80 caracteres.');
 if(!validStaffEmail(value.email))throw new Error('Ingresa un correo DEMO con formato válido.');
 if(!validStaffPhone(value.phone))throw new Error('El teléfono debe contener de 8 a 15 dígitos y hasta 24 caracteres.');
 if(!STAFF_ROLES.some(r=>r.value===value.role)||!STAFF_AREAS.some(a=>a.value===value.area)||!['active','inactive'].includes(value.status))throw new Error('Selecciona un rol, área y estado válidos.');
 return value;
}
export function staffInitials(name:string):string{const words=name.trim().split(/\s+/).filter(Boolean);return (words.length>1?[words[0],words[words.length-1]]:words).map(w=>Array.from(w)[0]).join('').toLocaleUpperCase('es-CL');}
const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-CL');
export function filterStaff(workers:AdminStaff[],filters:AdminStaffFilters):AdminStaff[]{
 const term=fold(filters.search.trim());return workers.filter(w=>(!term||fold(w.name+' '+w.email+' '+w.id).includes(term))&&(!filters.role||w.role===filters.role)&&(!filters.status||w.status===filters.status)).sort((a,b)=>(filters.order==='name-desc'?-1:1)*a.name.localeCompare(b.name,'es-CL',{sensitivity:'base'})||a.id.localeCompare(b.id));
}
export function staffSummary(workers:AdminStaff[]):AdminStaffSummary{return {registered:workers.length,active:workers.filter(w=>w.status==='active').length,activeBar:workers.filter(w=>w.status==='active'&&w.role==='bar').length,activeDoor:workers.filter(w=>w.status==='active'&&w.role==='door').length};}
