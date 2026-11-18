import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
export interface ConsumptionEvidence {orderId:string;status:'used';method:'qr'|'pin';occurredAt:number;workerId:string|null;sync:'local'|'pending'|'conflict';confirmation:'local-evidence';}
/** Contrato de presentación local. No confirma pagos ni sincronización global. */
@Injectable({providedIn:'root'})
export class DemoQrUseStateService {
 private readonly records=new BehaviorSubject<Readonly<Record<string,ConsumptionEvidence>>>({});private readonly reservations=new Set<string>();pinReady=true;
 readonly evidence$=this.records.pipe(map(records=>Object.fromEntries(Object.entries(records).map(([id,r])=>[id,{...r}]))));
 readonly used$=this.records.pipe(map(records=>new Set(Object.keys(records))));
 has(id:string){return !!this.records.value[id];}
 busy(id:string){return this.reservations.has(id);}
 evidence(id:string){const r=this.records.value[id];return r?{...r}:null;}
 reserve(id:string){if(this.has(id)||this.busy(id))return false;this.reservations.add(id);return true;}
 release(id:string){this.reservations.delete(id);}
 mark(id:string,details:Partial<Omit<ConsumptionEvidence,'orderId'|'status'|'confirmation'>>={}){if(!this.has(id))this.records.next({...this.records.value,[id]:{orderId:id,status:'used',method:details.method||'qr',occurredAt:details.occurredAt??Date.now(),workerId:details.workerId??null,sync:details.sync||'local',confirmation:'local-evidence'}});this.release(id);}
 restorePin(r:{orderId:string;redeemedAt:number;workerId:string;sync:string}){this.records.next({...this.records.value,[r.orderId]:{orderId:r.orderId,status:'used',method:'pin',occurredAt:r.redeemedAt,workerId:r.workerId,sync:r.sync==='pending'?'pending':r.sync==='conflict'?'conflict':'local',confirmation:'local-evidence'}});this.release(r.orderId);}
 resetPin(id:string){if(this.records.value[id]?.method==='pin'){const records={...this.records.value};delete records[id];this.records.next(records);}}
}
