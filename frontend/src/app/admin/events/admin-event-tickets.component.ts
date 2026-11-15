import { Component, Input } from '@angular/core';
import { FormArray, FormControl } from '@angular/forms';
import { AdminTicketForm, createTicketForm } from './admin-event-ticket-form';
import { EVENT_LIMITS, TICKET_STATUSES } from './admin-event.model';
@Component({selector:'app-admin-event-tickets',standalone:false,templateUrl:'./admin-event-tickets.component.html',styleUrls:['./admin-event-tickets.component.scss']})
export class AdminEventTicketsComponent {
  @Input({required:true}) types!:FormArray<AdminTicketForm>;
  readonly limits=EVENT_LIMITS; readonly statuses=TICKET_STATUSES;
  editingIndex:number|null=null; pendingRemoval:number|null=null;
  add():void {if(this.types.length<this.limits.ticketTypes){this.types.push(createTicketForm());this.types.markAsDirty();this.editingIndex=this.types.length-1;}}
  edit(index:number):void {this.editingIndex=index;this.pendingRemoval=null;}
  done(index:number):void {const type=this.types.at(index);type.markAllAsTouched();if(type.valid)this.editingIndex=null;}
  requestRemove(index:number):void {if(this.types.at(index).controls.name.value.trim()||this.types.at(index).dirty)this.pendingRemoval=index;else this.remove(index);}
  remove(index:number):void {this.types.removeAt(index);this.types.markAsDirty();this.editingIndex=null;this.pendingRemoval=null;}
  invalid(control:FormControl):boolean{return control.invalid&&control.touched;}
  get totalCapacity():number{return this.types.controls.reduce((total,type)=>total+(type.controls.capacity.valid?type.controls.capacity.value??0:0),0);}
}
