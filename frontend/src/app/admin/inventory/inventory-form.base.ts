import { Directive, HostListener } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
@Directive()
export abstract class InventoryFormBase {
  error='';baseline='';abstract signature():string;
  capture(){this.baseline=this.signature();}
  confirmLeave(){return this.signature()===this.baseline||window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?');}
  @HostListener('window:beforeunload',['$event']) unload(e:BeforeUnloadEvent){if(this.signature()!==this.baseline){e.preventDefault();e.returnValue='';}}
}
export const inventoryUnsavedGuard:CanDeactivateFn<InventoryFormBase>=component=>component.confirmLeave();
