import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CLUB_CONFIG } from '../club.config';
import { validSettingsColor } from './admin-settings.validation';
@Component({selector:'app-admin-settings-identity',standalone:false,templateUrl:'./admin-settings-identity.component.html',styleUrls:['./admin-settings-fields.scss','./admin-settings-identity.component.scss']})
export class AdminSettingsIdentityComponent {
 @Input({required:true}) group!:FormGroup;@Input() loading={logo:false,cover:false};@Input() errors={logo:'',cover:''};
 @Output() imageSelected=new EventEmitter<{kind:'logo'|'cover';event:Event}>();
 invalid(key:string):boolean{const c=this.group.get(key);return !!c?.invalid&&!!c.touched;}
 color(key:'primary'|'secondary'):string{const value=this.group.get(key)?.value;return validSettingsColor(value)?value:(key==='primary'?CLUB_CONFIG.branding.primary:CLUB_CONFIG.branding.accent);}
 pickColor(key:'primary'|'secondary',event:Event):void{this.group.get(key)!.setValue((event.target as HTMLInputElement).value);this.group.get(key)!.markAsDirty();}
}
