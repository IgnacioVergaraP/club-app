import { Injectable } from '@angular/core';
import { DemoRedemption, validReceipt } from './demo-redemption.model';
/** IndexedDB is only a local DEMO log, never a commercial source of truth. */
@Injectable({providedIn:'root'})
export class DemoRedemptionStore {
  private database?:Promise<IDBDatabase>;
  ngOnDestroy(){void this.database?.then(db=>db.close()).catch(()=>{});}
  private open():Promise<IDBDatabase>{
    if(!this.database)this.database=new Promise<IDBDatabase>((resolve,reject)=>{
      if(typeof indexedDB==='undefined'){reject(Error('Almacenamiento local no disponible.'));return;}
      const request=indexedDB.open('club-void-canje-demo-v1',1);let ended=false;
      const timer=setTimeout(()=>{ended=true;reject(Error('El almacenamiento local está bloqueado.'));},3000);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('receipts'))request.result.createObjectStore('receipts',{keyPath:'orderId'});};
      request.onsuccess=()=>{clearTimeout(timer);if(ended){request.result.close();return;}const db=request.result;db.onversionchange=()=>{db.close();this.database=undefined;};resolve(db);};
      request.onerror=()=>{clearTimeout(timer);reject(Error('No se pudo abrir el registro DEMO local.'));};
      request.onblocked=()=>{clearTimeout(timer);ended=true;reject(Error('Cierra otras versiones de la DEMO y reintenta.'));};
    }).catch(e=>{this.database=undefined;throw e;});return this.database!;
  }
  private async transaction<T>(mode:IDBTransactionMode,operation:(store:IDBObjectStore,result:(value:T)=>void)=>void):Promise<T>{
    const db=await this.open();return new Promise((resolve,reject)=>{
      const tx=db.transaction('receipts',mode);let value:T;const timer=setTimeout(()=>{try{tx.abort();}catch{}reject(Error('El registro local no respondió. No se confirmó el canje.'));},5000);
      tx.oncomplete=()=>{clearTimeout(timer);resolve(value);};tx.onabort=tx.onerror=()=>{clearTimeout(timer);reject(Error('No se pudo guardar/leer el canje local. Puede faltar espacio o permiso.'));};
      try{operation(tx.objectStore('receipts'),v=>value=v);}catch(e){tx.abort();reject(e);}
    });
  }
  async list():Promise<DemoRedemption[]>{
    const values=await this.transaction<unknown[]>('readonly',(store,result)=>{store.getAll().onsuccess=e=>result((e.target as IDBRequest).result);});
    if(!values.every(validReceipt))throw Error('Registro DEMO local incompatible. No se habilitan nuevos canjes.');return values.map(v=>({...v as DemoRedemption}));
  }
  /** Read+add in one readwrite transaction serializes competing tabs of this origin. */
  async redeem(receipt:DemoRedemption):Promise<{receipt:DemoRedemption;created:boolean}>{
    if(!validReceipt(receipt))throw Error('Registro DEMO inválido.');
    return this.transaction('readwrite',(store,result)=>{store.get(receipt.orderId).onsuccess=e=>{
      const old=(e.target as IDBRequest).result;if(old){if(!validReceipt(old)){store.transaction.abort();return;}result({receipt:{...old},created:false});}
      else{store.add({...receipt});result({receipt:{...receipt},created:true});}
    };});
  }
  async simulateConflict(orderId:string):Promise<void>{return this.transaction('readwrite',(store,result)=>{store.get(orderId).onsuccess=e=>{const old=(e.target as IDBRequest).result;if(!validReceipt(old)){store.transaction.abort();return;}store.put({...old,sync:'conflict'});result(undefined);};});}
  /** Explicit test-only reset requested by the Product Owner; deletes only this DEMO receipt. */
  async resetDemo(orderId:string):Promise<void>{
    if(!/^demo-drink-\d{3}$/.test(orderId))throw Error('Solo pedidos DEMO.');
    return this.transaction('readwrite',(store,result)=>{store.get(orderId).onsuccess=e=>{const old=(e.target as IDBRequest).result;if(old&&!validReceipt(old)){store.transaction.abort();return;}store.delete(orderId);result(undefined);};});
  }

}
