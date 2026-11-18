import { DOCUMENT } from '@angular/common';
import { Component, HostListener, Inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { AdminCommissionsService } from './admin-commissions.service';
import { AdminCommissionConfig, DEFAULT_COMMISSION_CONFIG } from './admin-commission.model';
import { rateToBps } from './admin-commission.logic';
const rateValidator=(c:AbstractControl)=>rateToBps(c.value)===null?{rate:true}:null;
const fixedValidator=(c:AbstractControl)=>Number.isInteger(c.value)&&c.value>=0&&c.value<=1000000?null:{fixed:true};
@Component({selector:'app-admin-commission-settings',standalone:false,templateUrl:'./admin-commission-settings.component.html',styleUrls:['./admin-commission-settings.component.scss']})
export class AdminCommissionSettingsComponent {
 mobile=false;message='';
 readonly form;
 constructor(readonly service:AdminCommissionsService,@Inject(DOCUMENT) private document:Document){
  const c=service.config;
  this.form=new FormGroup({codetecRate:new FormControl<number|null>(c.codetecBps/100,[Validators.required,rateValidator]),base:new FormControl(c.base,{nonNullable:true}),processorMode:new FormControl(c.processorMode,{nonNullable:true}),processorRate:new FormControl<number|null>(c.processorBps/100,[Validators.required,rateValidator]),processorFixed:new FormControl<number|null>(c.processorFixedClp,[Validators.required,fixedValidator]),processingPayer:new FormControl(c.processingPayer,{nonNullable:true}),vatMode:new FormControl(c.vatMode,{nonNullable:true})});
  this.form.controls.processorMode.valueChanges.pipe(startWith(c.processorMode),takeUntilDestroyed()).subscribe(mode=>{if(mode==='percent'){this.form.controls.processorRate.enable({emitEvent:false});this.form.controls.processorFixed.disable({emitEvent:false});}else{this.form.controls.processorRate.disable({emitEvent:false});this.form.controls.processorFixed.enable({emitEvent:false});}});
  this.resize();
 }
 @HostListener('window:resize') resize():void{this.mobile=!!this.document.defaultView?.matchMedia('(max-width:767px)').matches;}
 apply():void{
  this.form.markAllAsTouched();if(this.form.invalid){this.message='Revisa los valores; se mantiene la última revisión aplicada.';return;}
  const v=this.form.getRawValue(),prior=this.service.config;
  const config:AdminCommissionConfig={codetecBps:rateToBps(v.codetecRate)!,base:v.base,processorMode:v.processorMode,processorBps:v.processorMode==='percent'?rateToBps(v.processorRate)!:prior.processorBps,processorFixedClp:v.processorMode==='fixed'?v.processorFixed!:prior.processorFixedClp,processingPayer:v.processingPayer,vatMode:v.vatMode};
  try{this.service.apply(config);this.form.markAsPristine();this.message='revisión  aplicada. Sin cambios comerciales.';}catch{this.message='Configuración inválida; se mantiene la revisión anterior.';}
 }
 reset():void{const c=DEFAULT_COMMISSION_CONFIG;this.form.reset({codetecRate:c.codetecBps/100,base:c.base,processorMode:c.processorMode,processorRate:c.processorBps/100,processorFixed:c.processorFixedClp,processingPayer:c.processingPayer,vatMode:c.vatMode});this.apply();}
}
