import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AdminDrink } from './admin-drink.model';
@Component({selector:'app-admin-drink-row',standalone:false,templateUrl:'./admin-drink-row.component.html',styleUrls:['./admin-drink-row.component.scss']})
export class AdminDrinkRowComponent {
  @Input({required:true}) drink!:AdminDrink; @Input() category='';
  @Output() availabilityChange=new EventEmitter<void>(); @Output() featuredChange=new EventEmitter<void>(); @Output() duplicate=new EventEmitter<void>();
}
