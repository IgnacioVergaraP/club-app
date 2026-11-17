import { Component, HostListener, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CLUB_CONFIG } from '../admin/club.config';
import { QrCameraComponent } from './qr-camera.component';
import { ScanChannel, ScanResult } from './staff-scan.model';
import { StaffDrinksScanService, StaffTicketsScanService, STAFF_SCAN_CLOCK } from './staff-scan.service';
import { staffRecords } from './staff-scan.data';
@Component({selector:'app-staff-scan',standalone:false,templateUrl:'./staff-scan.component.html',styleUrls:['./staff-scan.component.scss']})
export class StaffScanComponent {
 readonly club=CLUB_CONFIG;private readonly drinks=inject(StaffDrinksScanService);readonly tickets=inject(StaffTicketsScanService);private readonly clock=inject(STAFF_SCAN_CLOCK);
 @ViewChild(QrCameraComponent) scanner?:QrCameraComponent;
 channel:ScanChannel='bar';result:ScanResult|null=null;private scanned='';private focusTimer:ReturnType<typeof setTimeout>|undefined;
 readonly form=new FormGroup({code:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(80)]})});
 get samples(){return staffRecords().filter(r=>r.channel===this.channel).map(r=>({code:r.code,label:r.status==='used'?'Ya utilizado':r.status==='expired'?'Vencido':r.reference==='DEMO-ENT-004'?'Otro evento':'Disponible'}));}
 get scenarioDate(){return new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',dateStyle:'medium',timeStyle:'short'}).format(this.clock());}
 constructor(){inject(ActivatedRoute).data.pipe(takeUntilDestroyed()).subscribe(data=>{this.scanner?.camera.stop();this.channel=data['channel'];this.result=null;this.scanned='';this.form.reset({code:''});});}
 manual(){this.form.markAllAsTouched();this.scan(this.form.controls.code.value);}
 scan(code:string){this.scanner?.camera.stop();this.scanned=code;this.result=this.channel==='bar'?this.drinks.inspect(code):this.tickets.inspect(code);this.focusResult();}
 confirm(){if(this.result?.outcome!=='ready')return;this.result=this.channel==='bar'?this.drinks.redeem(this.scanned):this.tickets.registerEntry(this.scanned);this.focusResult();}
 again(){this.result=null;this.scanned='';this.form.reset({code:''});this.focus('staff-manual-code');}
 private focusResult(){this.focus('staff-result-title');}
 private focus(id:string){if(this.focusTimer)clearTimeout(this.focusTimer);this.focusTimer=setTimeout(()=>document.getElementById(id)?.focus(),0);}
 @HostListener('window:pagehide') stop(){this.scanner?.camera.stop();}
 ngOnDestroy(){this.scanner?.camera.stop();if(this.focusTimer)clearTimeout(this.focusTimer);}
}
