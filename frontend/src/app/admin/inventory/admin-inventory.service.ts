import { Injectable, InjectionToken, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, map, take } from 'rxjs';
import { AdminDrinksService } from '../drinks/admin-drinks.service';
import { IngredientDraft, InventoryMovement, InventoryState, MovementKind, RecipeDraft } from './inventory.model';
import { initialInventory } from './inventory.data';
import { ingredientLabel, inventorySummary, normalize, recipeCapacity, stockFor, stockRows, validateIngredient, validateRecipe, whole } from './inventory.rules';
export const INVENTORY_CLOCK=new InjectionToken<()=>Date>('Inventory clock',{providedIn:'root',factory:()=>()=>new Date()});
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
@Injectable()
export class AdminInventoryService {
  private readonly clock=inject(INVENTORY_CLOCK);
  private readonly catalog=inject(AdminDrinksService);
  private readonly state=new BehaviorSubject<InventoryState>(initialInventory(this.clock()));
  private readonly notice=new BehaviorSubject('');
  readonly message$=this.notice.asObservable();
  readonly view$=combineLatest([this.state,this.catalog.drinks$]).pipe(map(([state,drinks])=>{const data=copy(state),rows=stockRows(data.ingredients,data.movements);return {...data,rows,summary:inventorySummary(rows),recipes:data.recipes.map(r=>({...r,capacity:recipeCapacity(r,rows)})),catalog:drinks.map(d=>({id:d.id,name:d.name}))};}));
  saveIngredient(draft:IngredientDraft,id?:string,initial=0):string {
    validateIngredient(draft);const s=this.state.value,old=id?s.ingredients.find(i=>i.id===id):undefined;
    if(id&&!old)throw Error('Ingrediente no encontrado en esta sesión.');
    if(old&&(old.kind!==draft.kind||old.unit!==draft.unit))throw Error('El tipo y la unidad no se cambian después del alta.');
    if(s.ingredients.some(i=>i.id!==id&&i.kind===draft.kind&&normalize(i.name)===normalize(draft.name)&&normalize(i.brand)===normalize(draft.brand)))throw Error('Ya existe ese ingrediente y marca. Edita el registro existente.');
    if(!id&&!whole(initial))throw Error('El saldo inicial debe ser un entero entre 0 y 1.000.000.');
    const item={id:id||`DEMO-ING-${s.ingredients.length+1}`,name:draft.name.trim().replace(/\s+/g,' '),brand:draft.brand.trim(),kind:draft.kind,unit:draft.unit,minimum:draft.minimum,enabled:draft.enabled,isDemo:true as const};
    const next={...s,ingredients:old?s.ingredients.map(i=>i.id===id?item:i):[...s.ingredients,item],movements:old?s.movements:[...s.movements,this.movement(item.id,'initial',initial,'Saldo inicial registrado',0,ingredientLabel(item),item.unit)]};
    this.state.next(next);this.notice.next(`${ingredientLabel(item)}: ${old?'cambios guardados':'ingrediente creado'}.`);return item.id;
  }
  recordMovement(ingredientId:string,kind:Exclude<MovementKind,'initial'>,quantity:number,reason:string):void {
    const s=this.state.value,item=s.ingredients.find(i=>i.id===ingredientId);
    if(!item||!['in','out','loss','adjustment'].includes(kind))throw Error('Selecciona un ingrediente y un tipo válido.');
    if(!whole(Math.abs(quantity),1)||(kind!=='adjustment'&&quantity<1))throw Error('Usa unidades enteras positivas; solo Ajuste admite una diferencia negativa.');
    if(typeof reason!=='string'||reason.trim().length<3||reason.trim().length>240)throw Error('Indica un motivo de 3 a 240 caracteres.');
    const before=stockFor(item.id,s.movements),m=this.movement(item.id,kind,quantity,reason.trim(),before,ingredientLabel(item),item.unit);
    if(!whole(m.after))throw Error('El movimiento dejaría un saldo negativo o superior a 1.000.000.');
    this.state.next({...s,movements:[...s.movements,m]});this.notice.next(`${m.label}: movimiento registrado · ${m.before} → ${m.after}.`);
  }
  saveRecipe(draft:RecipeDraft,id?:string){return this.catalog.drinks$.pipe(take(1),map(drinks=>{
    const s=this.state.value;validateRecipe(draft,s.ingredients);
    if(id&&!s.recipes.some(r=>r.id===id))throw Error('Receta no encontrada en esta sesión.');
    if(draft.drinkId&&!drinks.some(d=>d.id===draft.drinkId))throw Error('El trago de referencia ya no existe.');
    if(s.recipes.some(r=>r.id!==id&&(normalize(r.name)===normalize(draft.name)||(draft.drinkId&&r.drinkId===draft.drinkId))))throw Error('Ya existe una receta con ese nombre o trago.');
    const recipe={id:id||`DEMO-REC-${s.recipes.length+1}`,name:draft.name.trim(),drinkId:draft.drinkId,lines:draft.lines.map(l=>({ingredientId:l.ingredientId,quantity:l.quantity})),isDemo:true as const};
    this.state.next({...s,recipes:id?s.recipes.map(r=>r.id===id?recipe:r):[...s.recipes,recipe]});this.notice.next(`${recipe.name}: receta guardada sin descontar stock.`);return recipe.id;
  }));}
  private movement(ingredientId:string,kind:MovementKind,quantity:number,reason:string,before:number,label:string,unit:InventoryMovement['unit']):InventoryMovement {
    const sequence=this.state.value.movements.length+1,delta=kind==='out'||kind==='loss'?-quantity:quantity;
    return {id:`DEMO-MOV-${sequence}`,sequence,ingredientId,label,unit,kind,quantity,delta,at:this.clock().toISOString(),reason,before,after:before+delta,isDemo:true};
  }
}
