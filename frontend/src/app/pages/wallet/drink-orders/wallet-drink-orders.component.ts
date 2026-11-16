import { Component, Input, inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { WalletDrink } from '../../../models/wallet.model';
import { DemoRedemptionService } from '../../../services/redemption/demo-redemption.service';
import { DemoRedemption } from '../../../services/redemption/demo-redemption.model';
@Component({selector:'app-wallet-drink-orders',standalone:false,templateUrl:'./wallet-drink-orders.component.html',styleUrls:['./wallet-drink-orders.component.scss','./withdraw-dialog.scss']})
export class WalletDrinkOrdersComponent {
  @Input() drinks:WalletDrink[]=[];
  readonly service=inject(DemoRedemptionService);
  readonly pin=new FormControl('',{nonNullable:true,validators:[Validators.pattern(/^\d{6}$/)]});
  readonly digits=[1,2,3,4,5,6,7,8,9];readonly slots=[0,1,2,3,4,5];selected:string|null=null;validating=false;resetting=false;error='';private trigger:HTMLElement|null=null;
  readonly view$=this.service.view$.pipe(map(vm=>({...vm,orders:this.drinks.map(order=>{const receipt=vm.receipts.find(r=>r.orderId===order.id);return {order,receipt,visible:this.service.visible(receipt,vm.now),remaining:receipt?Math.max(0,Math.ceil((receipt.revealUntil-vm.now)/1000)):0,available:order.status==='pending'&&!receipt};})})));
  formatTime(seconds:number){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
  trackOrder(_:number,item:{order:WalletDrink}){return item.order.id;}
  open(id:string){if(this.selected!==id)this.trigger=document.activeElement as HTMLElement;this.selected=id;this.pin.reset();this.error='';setTimeout(()=>{const dialog=document.getElementById('withdraw-dialog-'+id) as HTMLDialogElement|null;if(dialog&&!dialog.open)dialog.showModal();document.getElementById('withdraw-pin-'+id)?.focus();});}
  close(){if(!this.validating&&!this.resetting){const id=this.selected;const dialog=document.getElementById('withdraw-dialog-'+id) as HTMLDialogElement|null;dialog?.close();this.selected=null;this.pin.reset();this.error='';if(this.trigger?.isConnected)this.trigger.focus();else document.querySelector<HTMLButtonElement>(`[data-order="${id}"] .withdraw`)?.focus();}}
  cancel(event:Event){event.preventDefault();this.close();}
  async reset(order:WalletDrink){if(this.validating||this.resetting)return;this.resetting=true;this.error='';try{await this.service.resetDemo(order);this.open(order.id);}catch{this.error='No se pudo reiniciar esta prueba. Se conserva el canje local.';}finally{this.resetting=false;}}
  entered(order:WalletDrink,event:Event){const input=event.target as HTMLInputElement;if(this.validating||this.resetting)return;const value=input.value.replace(/\D/g,'').slice(0,6);input.value=value;void this.authorize(order,value);}
  digit(order:WalletDrink,digit:number){if(this.validating||this.resetting)return;void this.authorize(order,(this.pin.value+digit).slice(0,6));}
  erase(){if(!this.validating&&!this.resetting){this.pin.setValue(this.pin.value.slice(0,-1));this.error='';}}
  private async authorize(order:WalletDrink,value:string){
    if(this.validating||this.resetting)return;this.pin.setValue(value);if(value.length!==6)return;
    this.validating=true;this.error='';this.pin.reset();
    try{await this.service.redeem(order,value);}catch(e){this.error=(e as Error).message;}finally{this.validating=false;}
  }
  async conflict(receipt:DemoRedemption){this.error='';try{await this.service.simulateConflict(receipt.orderId);}catch{this.error='No se pudo guardar el conflicto DEMO. Se conserva el registro existente.';}}
}
