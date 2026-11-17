import { DemoQrUseStateService } from '../services/redemption/demo-qr-use-state.service';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { staffRecords, STAFF_EVENT } from './staff-scan.data';
import { ScanResult, STAFF_SCENARIO_AT } from './staff-scan.model';
import { drinkOutcome, knownDemoRecord, scanResult, ticketOutcome } from './staff-scan.rules';
/** Escenario histórico de Wallet, con tiempo transcurrido desde abrir la SPA. No es reloj comercial. */
export const STAFF_SCAN_CLOCK=new InjectionToken<()=>number>('Staff scenario clock',{providedIn:'root',factory:()=>{const opened=Date.now();return ()=>STAFF_SCENARIO_AT+Date.now()-opened;}});
@Injectable({providedIn:'root'})
export class StaffDrinksScanService {
 private readonly clock=inject(STAFF_SCAN_CLOCK);private readonly records=staffRecords();private readonly redeemed=inject(DemoQrUseStateService);
 inspect(code:unknown):ScanResult {const r=knownDemoRecord(code,this.records);if(!r)return scanResult('invalid','bar');if(r.channel!=='bar')return scanResult('wrong-type','bar');return scanResult(drinkOutcome(r,this.redeemed.has(r.id),this.clock()),'bar',r);}
 redeem(code:unknown):ScanResult {const result=this.inspect(code);if(result.outcome!=='ready'||!result.record)return result;this.redeemed.mark(result.record.id);return scanResult('success','bar',{...result.record,status:'used'});}
}
@Injectable({providedIn:'root'})
export class StaffTicketsScanService {
 private readonly clock=inject(STAFF_SCAN_CLOCK);private readonly records=staffRecords();private readonly admitted=new Set<string>();
 readonly event={...STAFF_EVENT};
 inspect(code:unknown):ScanResult {const r=knownDemoRecord(code,this.records);if(!r)return scanResult('invalid','door');if(r.channel!=='door')return scanResult('wrong-type','door');return scanResult(ticketOutcome(r,this.admitted.has(r.id),this.clock(),STAFF_EVENT.id),'door',r);}
 registerEntry(code:unknown):ScanResult {const result=this.inspect(code);if(result.outcome!=='ready'||!result.record)return result;this.admitted.add(result.record.id);return scanResult('success','door',{...result.record,status:'used'});}
}
