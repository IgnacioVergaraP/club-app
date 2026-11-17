import { Injectable, InjectionToken, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { BehaviorSubject, combineLatest, fromEvent, map, merge } from 'rxjs';
import { DemoRedemptionService } from '../services/redemption/demo-redemption.service';
import { canReveal } from '../services/redemption/demo-redemption.model';
import { PwaInteractionService } from './pwa-interaction.service';
export interface PwaPlatform {online():boolean;prepare():Promise<boolean>;reload():void;}
export const PWA_PLATFORM=new InjectionToken<PwaPlatform>('PWA platform',{providedIn:'root',factory:()=>({
  online:()=>navigator.onLine,
  reload:()=>window.location.reload(),
  async prepare(){
    if(!('serviceWorker'in navigator)||!('caches'in window))return false;
    await navigator.serviceWorker.ready;
    if(!navigator.onLine)return !!navigator.serviceWorker.controller;
    const response=await fetch('/ngsw.json',{cache:'no-store'});if(!response.ok)return false;
    const manifest=await response.json();const urls:string[]=manifest.assetGroups.filter((g:{installMode:string})=>g.installMode==='prefetch').flatMap((g:{urls:string[]})=>g.urls);
    if(!urls.length)return false;
    const end=Date.now()+15000;do{const found=await Promise.all(urls.map(url=>caches.match(new URL(url,location.origin))));if(found.every(Boolean))return true;await new Promise(r=>setTimeout(r,400));}while(Date.now()<end);return false;
  }
})});
export const PWA_REDEMPTION_LOCK=new InjectionToken('PWA redemption protection',{providedIn:'root',factory:()=>inject(DemoRedemptionService).view$.pipe(map(vm=>vm.busy.length>0||vm.receipts.some(r=>canReveal(r,vm.now))))});
@Injectable({providedIn:'root'})
export class PwaService {
  private readonly updates=inject(SwUpdate,{optional:true});private readonly platform=inject(PWA_PLATFORM);
  private readonly activity=inject(PwaInteractionService);private readonly redemption=inject(PWA_REDEMPTION_LOCK);
  private readonly state=new BehaviorSubject({enabled:!!this.updates?.isEnabled,online:this.platform.online(),ready:false,preparing:false,update:false,error:'',blocked:false});
  readonly state$=this.state.asObservable();private checking=false;
  constructor(){
    combineLatest([this.activity.blocked$,this.redemption]).pipe(takeUntilDestroyed()).subscribe(([a,b])=>this.patch({blocked:a||b}));
    merge(fromEvent(window,'online'),fromEvent(window,'offline')).pipe(takeUntilDestroyed()).subscribe(()=>{this.patch({online:this.platform.online()});if(this.platform.online())void this.prepare();});
    if(this.updates?.isEnabled){
      this.updates.versionUpdates.pipe(takeUntilDestroyed()).subscribe(event=>{
        if(event.type==='VERSION_READY')this.patch({update:true,error:''});
        if(event.type==='VERSION_INSTALLATION_FAILED')this.patch({error:'No se pudo preparar la nueva versión. Se conserva la actual.'});
      });
      this.updates.unrecoverable.pipe(takeUntilDestroyed()).subscribe(()=>this.patch({update:true,error:'La versión actual requiere recarga. Espera a terminar el canje antes de actualizar.'}));
      void this.prepare();
    }
  }
  async prepare(){
    if(!this.updates?.isEnabled||this.checking)return;this.checking=true;this.patch({preparing:true,error:''});
    try{await this.updates.checkForUpdate();const ready=await this.platform.prepare();this.patch({ready,error:ready?'':'Preparación offline no verificada. Conéctate y reintenta.'});}
    catch{this.patch({error:'No se pudo verificar la preparación offline. La conectividad no acredita acceso al servidor.'});}
    finally{this.checking=false;this.patch({preparing:false});}
  }
  update(){const s=this.state.value;if(!s.update||s.blocked||!this.platform.online())return false;this.platform.reload();return true;}
  private patch(value:Partial<typeof this.state.value>){this.state.next({...this.state.value,...value});}
}
