import { Component, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map, startWith } from 'rxjs';
import { AdminInventoryService } from './admin-inventory.service';
import { MOVEMENT_LABELS, STATUS_LABELS } from './inventory.model';
import { normalize, unitWord } from './inventory.rules';
export const INVENTORY_TABS=['alcohols','beverages','low'] as const;
@Component({selector:'app-admin-inventory',standalone:false,templateUrl:'./admin-inventory.component.html',styleUrls:['./inventory.shared.scss','./admin-inventory.component.scss']})
export class AdminInventoryComponent {
  readonly service=inject(AdminInventoryService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);
  readonly tabs=INVENTORY_TABS;readonly titles=['Alcoholes','Bebidas','Bajo stock'];readonly statuses=STATUS_LABELS;readonly movementLabels=MOVEMENT_LABELS;readonly unitWord=unitWord;
  readonly filters=new FormGroup({search:new FormControl('',{nonNullable:true}),ingredient:new FormControl('',{nonNullable:true}),movement:new FormControl('',{nonNullable:true})});
  readonly vm$=combineLatest([this.service.view$,this.route.queryParamMap,this.filters.valueChanges.pipe(startWith(this.filters.getRawValue()))]).pipe(map(([data,params])=>{
    const view=[...INVENTORY_TABS,'movements','recipes'].find(t=>t===params.get('view'))||'alcohols',f=this.filters.getRawValue(),q=normalize(f.search);
    return {...data,view,selected:data.rows.find(r=>r.id===params.get('ingredient')),items:data.rows.filter(r=>(view==='low' ? r.status==='low'||r.status==='out' : r.kind===(view==='alcohols'?'alcohol':'beverage'))&&normalize(r.label+' '+r.brand).includes(q)),history:data.movements.filter(m=>(!f.ingredient||m.ingredientId===f.ingredient)&&(!f.movement||m.kind===f.movement)&&normalize(m.id+' '+m.label+' '+m.reason).includes(q)).slice().reverse(),filteredRecipes:data.recipes.filter(r=>normalize(r.name).includes(q))};
  }));
  chooseTab(view:string){this.filters.reset({search:'',ingredient:'',movement:''});void this.router.navigate([],{relativeTo:this.route,queryParams:{view}});}
  select(id:string|null,view:string){void this.router.navigate([],{relativeTo:this.route,queryParams:{view,ingredient:id}});}
  key(event:KeyboardEvent,index:number){let next=index;if(event.key==='ArrowRight')next=(index+1)%this.tabs.length;else if(event.key==='ArrowLeft')next=(index+this.tabs.length-1)%this.tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=this.tabs.length-1;else return;event.preventDefault();this.chooseTab(this.tabs[next]);document.getElementById('inventory-tab-'+this.tabs[next])?.focus();}
  reset(){this.filters.reset({search:'',ingredient:'',movement:''});}
}
