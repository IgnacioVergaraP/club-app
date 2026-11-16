import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AdminWeekDay, SETTINGS_DAYS, SETTINGS_LIMITS } from './admin-settings.model';
@Component({selector:'app-admin-settings-general',standalone:false,templateUrl:'./admin-settings-general.component.html',styleUrls:['./admin-settings-fields.scss']})
export class AdminSettingsGeneralComponent {
 @Input({required:true}) group!:FormGroup;readonly limits=SETTINGS_LIMITS;
 invalid(key:string):boolean{const c=this.group.get(key);return !!c?.invalid&&!!c.touched;}
}
@Component({selector:'app-admin-settings-commercial',standalone:false,templateUrl:'./admin-settings-commercial.component.html',styleUrls:['./admin-settings-fields.scss']})
export class AdminSettingsCommercialComponent {
 @Input({required:true}) group!:FormGroup;readonly limits=SETTINGS_LIMITS;
 invalid(key:string):boolean{const c=this.group.get(key);return !!c?.invalid&&!!c.touched;}
}
@Component({selector:'app-admin-settings-operation',standalone:false,templateUrl:'./admin-settings-operation.component.html',styleUrls:['./admin-settings-fields.scss']})
export class AdminSettingsOperationComponent {
 @Input({required:true}) group!:FormGroup;readonly days=SETTINGS_DAYS;readonly limits=SETTINGS_LIMITS;
 invalid(key:string):boolean{const c=this.group.get(key);return !!c?.invalid&&!!c.touched;}
 toggleDay(day:AdminWeekDay):void{const control=this.group.get('days')!;const current=control.value as AdminWeekDay[];const next=current.includes(day)?current.filter(v=>v!==day):[...current,day];control.setValue(this.days.filter(d=>next.includes(d.id)).map(d=>d.id));control.markAsDirty();control.markAsTouched();}
}
