import { Component, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { AdminClubSettings, AdminSettingsSection, SETTINGS_SECTIONS } from './admin-settings.model';
import { AdminSettingsService } from './admin-settings.service';
import { createSettingsForm } from './admin-settings.validation';
import { readAdminImage } from '../admin-image';
import { Subject, takeUntil } from 'rxjs';
@Component({selector:'app-admin-settings',standalone:false,templateUrl:'./admin-settings.component.html',styleUrls:['./admin-settings.component.scss']})
export class AdminSettingsComponent implements OnDestroy {
 readonly form;section:AdminSettingsSection='general';message='';error='';
 loading={logo:false,cover:false};imageErrors={logo:'',cover:''};private requests={logo:0,cover:0};private disposed=false;
 private baseline='';private dirty=false;private readonly destroy$=new Subject<void>();
 constructor(private service:AdminSettingsService,private element:ElementRef<HTMLElement>){
  this.form=createSettingsForm(service.current);this.load(service.current);
  this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(()=>{this.dirty=this.signature()!==this.baseline;this.message='';this.error='';});
 }
 get busy():boolean{return this.loading.logo||this.loading.cover;}
 get hasUnsavedChanges():boolean{return this.dirty||this.busy;}
 get sectionLabel():string{return SETTINGS_SECTIONS.find(s=>s.id===this.section)!.label;}
 get preview():AdminClubSettings{return {isDemo:true,...this.form.getRawValue()};}
 setSection(section:AdminSettingsSection):void{this.section=section;}
 save():void {
  if(this.busy)return;this.error='';this.form.markAllAsTouched();
  if(this.form.invalid){this.error='Revisa los campos marcados antes de guardar la configuración DEMO.';const section=(['general','identity','commercial','operation'] as const).find(key=>this.form.controls[key].invalid)!;this.section=section;requestAnimationFrame(()=>{const invalid=this.element.nativeElement.querySelector<HTMLInputElement>('[aria-invalid="true"] input, input[aria-invalid="true"],textarea[aria-invalid="true"]');(invalid||this.element.nativeElement.querySelector<HTMLInputElement>('#settings-closes-at'))?.focus();});return;}
  try{this.load(this.service.save(this.preview));this.message='Configuración DEMO guardada en memoria. No se modificaron otras pantallas ni servicios.';}catch(error){this.error=(error as Error).message;}
 }
 discard():void {if(this.hasUnsavedChanges&&!window.confirm('¿Descartar los cambios sin guardar de esta configuración DEMO?'))return;this.load(this.service.current);this.message='Borrador descartado. Se conserva la última configuración DEMO guardada.';}
 reset():void {if(!window.confirm('¿Restablecer los valores DEMO iniciales de esta pantalla? Se descartará el borrador y la configuración guardada aquí; no se modifica ninguna otra pantalla.'))return;this.load(this.service.reset());this.message='Configuración DEMO restablecida desde la identidad inicial del club.';}
 async upload(kind:'logo'|'cover',event:Event):Promise<void>{
  const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;
  const request=++this.requests[kind];this.loading[kind]=true;this.imageErrors[kind]='';this.message='';
  try{const value=await readAdminImage(file);if(this.disposed||request!==this.requests[kind])return;this.form.controls.identity.controls[kind].setValue(value);this.form.controls.identity.controls[kind].markAsDirty();}
  catch(error){if(!this.disposed&&request===this.requests[kind]){input.value='';this.imageErrors[kind]=(error as Error).message+' Se conserva la imagen anterior.';}}
  finally{if(!this.disposed&&request===this.requests[kind])this.loading[kind]=false;}
 }
 confirmLeave():boolean{return !this.hasUnsavedChanges||window.confirm('Hay cambios de configuración sin guardar. ¿Quieres salir y descartar el borrador DEMO?');}
 @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent):void{if(this.hasUnsavedChanges){event.preventDefault();event.returnValue='';}}
 ngOnDestroy():void{this.disposed=true;this.requests.logo++;this.requests.cover++;this.destroy$.next();this.destroy$.complete();}
 private load(value:AdminClubSettings):void{this.requests.logo++;this.requests.cover++;this.loading={logo:false,cover:false};this.imageErrors={logo:'',cover:''};this.form.reset(value,{emitEvent:false});this.form.markAsPristine();this.baseline=this.signature();this.dirty=false;this.error='';this.element.nativeElement.querySelectorAll<HTMLInputElement>('input[type=file]').forEach(input=>input.value='');}
 private signature():string{return JSON.stringify(this.form.getRawValue());}
}
