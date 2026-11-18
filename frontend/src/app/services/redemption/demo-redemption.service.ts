import { DemoQrUseStateService } from './demo-qr-use-state.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, fromEvent, map, merge, startWith, timer } from 'rxjs';
import { WalletDrink } from '../../models/wallet.model';
import { DemoPinService } from './demo-pin.service';
import { DemoRedemptionStore } from './demo-redemption-store.service';
import { DemoRedemption, DEMO_PIN_WORKERS, REVEAL_MS, canReveal } from './demo-redemption.model';
export const REDEMPTION_NOW=new InjectionToken<()=>number>('Redemption clock',{providedIn:'root',factory:()=>()=>Date.now()});
@Injectable({providedIn:'root'})
export class DemoRedemptionService {
  private readonly consumption=inject(DemoQrUseStateService);
  private readonly store=inject(DemoRedemptionStore);private readonly pins=inject(DemoPinService);private readonly now=inject(REDEMPTION_NOW);
  private readonly records=new BehaviorSubject<DemoRedemption[]>([]);
  private readonly busy=new BehaviorSubject<string[]>([]);
  private readonly storage=new BehaviorSubject({ready:false,error:''});
  private readonly simulation=new BehaviorSubject(false);
  private readonly inFlight=new Map<string,Promise<DemoRedemption>>();
  readonly view$=combineLatest([this.records,this.busy,this.storage,this.simulation,merge(fromEvent(window,'online'),fromEvent(window,'offline'),fromEvent(document,'visibilitychange'),fromEvent(window,'focus'),timer(0,1000)).pipe(startWith(null))]).pipe(map(([receipts,busy,storage,simulated])=>({receipts:receipts.map(r=>({...r})),busy:[...busy],...storage,simulated,offline:simulated||!navigator.onLine,now:this.now()})));
  constructor(){this.consumption.pinReady=false;void this.reload();merge(fromEvent(window,'focus'),fromEvent(document,'visibilitychange')).pipe(takeUntilDestroyed()).subscribe(()=>{void this.reload();});}
  async reload(){try{const values=await this.store.list();this.records.next(values);values.forEach(r=>this.consumption.restorePin(r));this.consumption.pinReady=true;this.storage.next({ready:true,error:''});}catch{this.consumption.pinReady=false;this.storage.next({ready:false,error:'No se pudo leer el registro  local. No se habilita el canje. Reintenta sin borrar los datos.'});}}
  setOfflineSimulation(value:boolean){this.simulation.next(value);}
  redeem(order:WalletDrink,pin:string):Promise<DemoRedemption>{
    if(this.inFlight.has(order.id))return this.inFlight.get(order.id)!;
    const action=this.perform(order,pin);this.inFlight.set(order.id,action);this.busy.next([...this.inFlight.keys()]);
    void action.finally(()=>{this.inFlight.delete(order.id);this.busy.next([...this.inFlight.keys()]);}).catch(()=>{});return action;
  }
  private async perform(order:WalletDrink,pin:string):Promise<DemoRedemption>{
    if(!this.storage.value.ready)throw Error('Registro local no disponible. No se realizó el canje.');
    if(this.consumption.has(order.id))throw Error('Este pedido ya fue canjeado.');
    if((order as WalletDrink & {paymentStatus?:string}).paymentStatus==='pending_payment')throw Error('El pago todavía no está confirmado.');
    if(!order.isDemo||order.status!=='pending'||!/^demo-drink-\d{3}$/.test(order.id)||!order.reference.startsWith('DEMO-'))throw Error('Este pedido no está disponible para canje.');
    if(this.records.value.some(r=>r.orderId===order.id))throw Error('Este pedido ya fue canjeado en este dispositivo.');
    if(!/^\d{6}$/.test(pin))throw Error('PIN no válido.');
    const workerId=await this.pins.validate(pin);if(!workerId)throw Error('PIN no válido.');
    const now=this.now(),receipt:DemoRedemption={orderId:order.id,redeemedAt:now,revealUntil:now+REVEAL_MS,workerId,sync:this.simulation.value||!navigator.onLine?'pending':'demo_only',isDemo:true};
    if(!this.consumption.reserve(order.id)){await this.reload();throw Error('Este pedido ya fue canjeado o se está procesando.');}
    let result;try{result=await this.store.redeem(receipt);}catch{this.consumption.release(order.id);throw Error('No se pudo guardar el canje local. No se confirmó el retiro. Revisa el almacenamiento y reintenta.');}
    this.consumption.restorePin(result.receipt);
    this.records.next([...this.records.value.filter(r=>r.orderId!==order.id),{...result.receipt}]);
    if(!result.created)throw Error('Este pedido ya fue canjeado en otra vista de esta sesión.');return {...result.receipt};
  }
  async resetDemo(order:WalletDrink){
    if(!order.isDemo||order.status!=='pending'||!/^demo-drink-\d{3}$/.test(order.id)||!order.reference.startsWith('DEMO-')||this.inFlight.has(order.id))throw Error('No se puede reiniciar este pedido.');
    await this.store.resetDemo(order.id);this.consumption.resetPin(order.id);this.records.next(this.records.value.filter(r=>r.orderId!==order.id));
  }
  async simulateConflict(orderId:string){await this.store.simulateConflict(orderId);await this.reload();}
  worker(id:string){return DEMO_PIN_WORKERS.find(w=>w.id===id)?.name||'Personal ';}
  visible(receipt:DemoRedemption|undefined,now:number){return canReveal(receipt,now);}
}
