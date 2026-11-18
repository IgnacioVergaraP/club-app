import { PresentationBridgeService } from '../../services/presentation-bridge.service';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { AdminDrink, AdminDrinkDraft, DRINK_LIMITS } from './admin-drink.model';
import { ADMIN_DEMO_DRINKS } from './admin-drinks.data';
import { validateAdminDrink } from './admin-drink.validation';
const payload=(drink:AdminDrinkDraft):AdminDrinkDraft=>({name:drink.name.trim(),description:drink.description.trim(),category:drink.category,priceClp:drink.priceClp,available:drink.available,featured:drink.featured,image:drink.image});
const copy=(drink:AdminDrink):AdminDrink=>({...payload(drink),id:drink.id,isDemo:true});
@Injectable({providedIn:'root'})
export class AdminDrinksService {
  constructor(private readonly presentation:PresentationBridgeService=new PresentationBridgeService()){}
  private nextId=6;
  private readonly records=new BehaviorSubject<AdminDrink[]>(ADMIN_DEMO_DRINKS.map(copy));
  private readonly notice=new BehaviorSubject('');
  readonly drinks$=this.records.pipe(map(drinks=>drinks.map(copy)));
  readonly message$=this.notice.asObservable();
  save(draft:AdminDrinkDraft,id?:string):AdminDrink{
    validateAdminDrink(draft);
    if(id&&!this.records.value.some(drink=>drink.id===id))throw new Error('Este trago  no está disponible en la sesión actual.');
    const drink:AdminDrink={...payload(draft),id:id||`admin-demo-drink-${String(this.nextId++).padStart(3,'0')}`,isDemo:true};
    this.records.next(id?this.records.value.map(item=>item.id===id?drink:item):[...this.records.value,drink]);
    this.presentation.drinkSaved(drink);this.notice.next(`${drink.name}: ${id?'cambios guardados':'trago creado'} en esta sesión.`);return copy(drink);
  }
  setAvailability(id:string,available:boolean):void{const drink=this.find(id);this.save({...drink,available},id);this.notice.next(`${drink.name}: ${available?'disponible':'no disponible'} en la carta.`);}
  setFeatured(id:string,featured:boolean):void{const drink=this.find(id);this.save({...drink,featured},id);this.notice.next(`${drink.name}: ${featured?'destacado':'sin destacar'} en esta sesión.`);}
  duplicate(id:string):AdminDrink{const original=this.find(id);const duplicate=this.save({...payload(original),name:original.name.slice(0,DRINK_LIMITS.name-8)+' (copia)'});this.notice.next(`Copia de ${original.name} creada. Edita el nombre y sus datos para preparar la variante.`);return duplicate;}
  private find(id:string):AdminDrink{const drink=this.records.value.find(item=>item.id===id);if(!drink)throw new Error('Este trago  no está disponible en la sesión actual.');return drink;}
}
