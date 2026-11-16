import { Ingredient, IngredientDraft, InventoryMovement, InventoryRecipe, InventorySummary, RecipeCapacity, RecipeDraft, StockRow, StockStatus, InventoryUnit } from './inventory.model';
export const INVENTORY_LIMIT=1_000_000;
export const whole=(n:unknown,min=0):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=INVENTORY_LIMIT;
export const normalize=(s:string)=>s.trim().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const unitWord=(unit:InventoryUnit)=>({glass:'vasos',portion:'porciones',unit:'unidades'}[unit]);
export const ingredientLabel=(item:IngredientDraft)=>`${{glass:'Vasos',portion:'Porciones',unit:'Unidades'}[item.unit]} de ${item.kind==='alcohol'?item.name.toLocaleLowerCase('es-CL'):item.name}`;
export const stockStatus=(stock:number,minimum:number):StockStatus=>stock===0?'out':stock<=minimum?'low':'available';
export function validateIngredient(d:IngredientDraft):void {
  if(!d||typeof d.name!=='string'||!d.name.trim()||d.name.trim().length>80||typeof d.brand!=='string'||d.brand.length>80)throw Error('Indica un nombre de 1 a 80 caracteres y una marca de hasta 80.');
  if(!['alcohol','beverage'].includes(d.kind)||!(d.kind==='alcohol'?['glass','portion']:['unit']).includes(d.unit))throw Error('El tipo y la unidad deben corresponder: vasos o porciones para alcohol; unidades para bebidas.');
  if(/\b(botellas?|litros?|mililitros?|ml|cl|lt)\b|\d\s*(ml|cl|l)\b/i.test(d.name+' '+d.brand)||/^(vasos?|porciones?|unidades?|bebida|alcohol)$/i.test(normalize(d.name))||/^(vasos|porciones|unidades) de /i.test(d.name))throw Error('Usa el nombre del ingrediente (por ejemplo Pisco), sin cantidades, envases ni volúmenes. La unidad se muestra por separado.');
  if(!whole(d.minimum)||typeof d.enabled!=='boolean')throw Error('El mínimo debe ser un entero entre 0 y 1.000.000.');
}
export function stockFor(id:string,movements:readonly InventoryMovement[]):number {
  let stock=0,initialized=false,sequence=0;const ids=new Set<string>();
  for(const m of movements.filter(m=>m.ingredientId===id)) {
    const expected=m.kind==='out'||m.kind==='loss'?-m.quantity:m.quantity;
    if(!['initial','in','out','loss','adjustment'].includes(m.kind)||ids.has(m.id)||m.sequence<=sequence||!Number.isSafeInteger(m.sequence)||!whole(m.before)||!whole(m.after)||!Number.isSafeInteger(m.delta)||m.delta!==expected||m.before!==stock||m.after!==stock+m.delta||!Number.isFinite(Date.parse(m.at))||!m.reason.trim()||m.isDemo!==true||
      (m.kind==='initial'?(initialized||!whole(m.quantity)):(!initialized||!whole(Math.abs(m.quantity),1)||(m.kind!=='adjustment'&&m.quantity<1))))throw Error('Historial de inventario incoherente.');
    initialized=true;stock=m.after;sequence=m.sequence;ids.add(m.id);
  }
  return stock;
}
export function stockRows(ingredients:Ingredient[],movements:InventoryMovement[]):StockRow[]{return ingredients.map(i=>{const stock=stockFor(i.id,movements);return {...i,stock,status:stockStatus(stock,i.minimum),label:ingredientLabel(i)};});}
export function inventorySummary(rows:StockRow[]):InventorySummary{return {alcohols:rows.filter(i=>i.kind==='alcohol').length,beverages:rows.filter(i=>i.kind==='beverage').length,low:rows.filter(i=>i.status==='low').length,out:rows.filter(i=>i.status==='out').length};}
export function validateRecipe(d:RecipeDraft,ingredients:Ingredient[]):void {
  if(!d||typeof d.name!=='string'||!d.name.trim()||d.name.trim().length>80||!Array.isArray(d.lines)||!d.lines.length||d.lines.length>50||!(d.drinkId===null||typeof d.drinkId==='string'))throw Error('Indica un nombre y al menos un ingrediente (máximo 50).');
  const ids=new Set<string>();for(const line of d.lines){if(!line||!ingredients.some(i=>i.id===line.ingredientId)||ids.has(line.ingredientId)||!whole(line.quantity,1))throw Error('Cada ingrediente debe existir, aparecer una sola vez y requerir unidades enteras positivas.');ids.add(line.ingredientId);}
}
export function recipeCapacity(recipe:RecipeDraft,rows:StockRow[]):RecipeCapacity {
  try{validateRecipe(recipe,rows);}catch{return {possible:0,valid:false,limiting:[],reason:'Receta vacía o inválida'};}
  const inactive=recipe.lines.filter(l=>!rows.find(r=>r.id===l.ingredientId)!.enabled);
  if(inactive.length)return {possible:0,valid:true,limiting:inactive.map(l=>l.ingredientId),reason:'Ingrediente deshabilitado para recetas'};
  if(recipe.lines.some(l=>!whole(rows.find(r=>r.id===l.ingredientId)!.stock)))return {possible:0,valid:false,limiting:[],reason:'Existencias inválidas'};
  const amounts=recipe.lines.map(l=>Math.floor(rows.find(r=>r.id===l.ingredientId)!.stock/l.quantity));const possible=Math.min(...amounts);
  return {possible,valid:true,limiting:recipe.lines.filter((_,i)=>amounts[i]===possible).map(l=>l.ingredientId),reason:possible?'Capacidad orientativa; no reserva existencias':'Sin existencias suficientes'};
}
