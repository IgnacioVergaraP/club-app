import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, defer, map, startWith } from 'rxjs';
import { AdminDrink, DRINK_CATEGORIES } from './admin-drink.model';
import { AdminDrinksService } from './admin-drinks.service';
@Component({selector:'app-admin-drinks',standalone:false,templateUrl:'./admin-drinks.component.html',styleUrls:['./admin-drinks.component.scss']})
export class AdminDrinksComponent {
  readonly categories=DRINK_CATEGORIES;
  readonly search=new FormControl('',{nonNullable:true});readonly category=new FormControl('',{nonNullable:true});
  readonly availability=new FormControl('',{nonNullable:true});readonly order=new FormControl('name',{nonNullable:true});
  readonly message$=this.service.message$;error='';
  readonly view$=combineLatest([this.service.drinks$,defer(()=>this.search.valueChanges.pipe(startWith(this.search.value))),defer(()=>this.category.valueChanges.pipe(startWith(this.category.value))),defer(()=>this.availability.valueChanges.pipe(startWith(this.availability.value))),defer(()=>this.order.valueChanges.pipe(startWith(this.order.value)))]).pipe(map(([all,query,category,availability,order])=>({total:all.length,
    drinks:all.filter(drink=>drink.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'))&&(!category||drink.category===category)&&(!availability||drink.available===(availability==='available')))
    .sort((a,b)=>order==='price-asc'?a.priceClp-b.priceClp||a.name.localeCompare(b.name,'es'):order==='price-desc'?b.priceClp-a.priceClp||a.name.localeCompare(b.name,'es'):a.name.localeCompare(b.name,'es')*(order==='name-desc'?-1:1))
  })));
  constructor(private readonly service:AdminDrinksService,private readonly router:Router){}
  categoryLabel(value:string):string{return this.categories.find(item=>item.value===value)?.label||value;}
  trackDrink(_:number,drink:AdminDrink):string{return drink.id;}
  toggleAvailability(drink:AdminDrink):void{this.perform(()=>this.service.setAvailability(drink.id,!drink.available));}
  toggleFeatured(drink:AdminDrink):void{this.perform(()=>this.service.setFeatured(drink.id,!drink.featured));}
  duplicate(drink:AdminDrink):void{this.perform(()=>{const copy=this.service.duplicate(drink.id);void this.router.navigate(['/admin/tragos',copy.id,'editar']);});}
  clearFilters():void{this.search.setValue('');this.category.setValue('');this.availability.setValue('');this.order.setValue('name');}
  private perform(action:()=>void):void{this.error='';try{action();}catch(error){this.error=(error as Error).message;}}
}
