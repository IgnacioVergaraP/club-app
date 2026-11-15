import { ValidatorFn } from '@angular/forms';
import { isAdminImageReference } from '../admin-image';
import { AdminDrinkDraft, DRINK_CATEGORIES, DRINK_IMAGES, DRINK_LIMITS } from './admin-drink.model';
export const requiredDrinkName:ValidatorFn = control => typeof control.value==='string' && control.value.trim() ? null : {required:true};
export const drinkPriceValidator:ValidatorFn = control => typeof control.value==='number' && Number.isSafeInteger(control.value) && control.value>=0 && control.value<=DRINK_LIMITS.priceClp ? null : {drinkPrice:true};
export const drinkImageValidator:ValidatorFn = control => isAdminImageReference(control.value,DRINK_IMAGES) ? null : {drinkImage:true};
export function validateAdminDrink(value:AdminDrinkDraft):void {
  if(!value || typeof value.name!=='string' || !value.name.trim() || value.name.length>DRINK_LIMITS.name
    || typeof value.description!=='string' || value.description.length>DRINK_LIMITS.description
    || !DRINK_CATEGORIES.some(category=>category.value===value.category)
    || !Number.isSafeInteger(value.priceClp) || value.priceClp<0 || value.priceClp>DRINK_LIMITS.priceClp
    || typeof value.available!=='boolean' || typeof value.featured!=='boolean' || !isAdminImageReference(value.image,DRINK_IMAGES))
    throw new Error('Revisa nombre, categoría, precio entero no negativo e imagen válida antes de guardar.');
}
