import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, defer, map, startWith } from 'rxjs';
import { AdminDrink, DRINK_CATEGORIES } from './admin-drink.model';
import { AdminDrinksService } from './admin-drinks.service';
@Component({selector:'app-admin-drinks',standalone:false,templateUrl:'./admin-drinks.component.html',styleUrls:['./admin-drinks.component.scss']})
export class AdminDrinksComponent {
  readonly categories=DRINK_CATEGORIES;
  readonly search=new FormControl('',{nonNullable:true});
  readonly message$=this.service.message$;error='';
  readonly view$=combineLatest([this.service.drinks$,defer(()=>this.search.valueChanges.pipe(startWith(this.search.value)))]).pipe(map(([all,query])=>({total:all.length,
    drinks:all.filter(drink=>drink.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))
  })));
  constructor(private readonly service:AdminDrinksService,private readonly router:Router){}
  categoryLabel(value:string):string{return this.categories.find(item=>item.value===value)?.label||value;}
  trackDrink(_:number,drink:AdminDrink):string{return drink.id;}
  toggleAvailability(drink:AdminDrink):void{this.perform(()=>this.service.setAvailability(drink.id,!drink.available));}
  toggleFeatured(drink:AdminDrink):void{this.perform(()=>this.service.setFeatured(drink.id,!drink.featured));}
  duplicate(drink:AdminDrink):void{this.perform(()=>{const copy=this.service.duplicate(drink.id);void this.router.navigate(['/admin/tragos',copy.id,'editar']);});}
  clearFilters():void{this.search.setValue('');}
  private perform(action:()=>void):void{this.error='';try{action();}catch(error){this.error=(error as Error).message;}}
}
