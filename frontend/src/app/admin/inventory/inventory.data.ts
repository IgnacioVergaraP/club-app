import { InventoryState, Ingredient, InventoryMovement } from './inventory.model';
import { ingredientLabel } from './inventory.rules';
export function initialInventory(now:Date):InventoryState {
  const names=['Pisco','Ron','Vodka','Gin','Coca-Cola','Sprite','Tónica','Jugo'];const stocks=[110,80,60,40,45,35,45,30],mins=[20,20,15,40,15,10,10,30];
  const ingredients:Ingredient[]=names.map((name,i)=>({id:`DEMO-ING-${i+1}`,name,brand:'',kind:i<4?'alcohol':'beverage',unit:i<4?'glass':'unit',minimum:mins[i],enabled:true,isDemo:true}));
  const movements:InventoryMovement[]=ingredients.map((item,i)=>({id:`DEMO-MOV-${i+1}`,sequence:i+1,ingredientId:item.id,label:ingredientLabel(item),unit:item.unit,kind:'initial',quantity:stocks[i],delta:stocks[i],before:0,after:stocks[i],at:new Date(now.getTime()-86400000+i*1000).toISOString(),reason:'Saldo inicial de ejemplo',isDemo:true}));
  for(const [i,kind,quantity,before,after,reason] of [[0,'out',10,110,100,'Salida ilustrativa de preparación'],[4,'in',10,45,55,'Reposición ilustrativa'],[4,'loss',5,55,50,'Unidades dañadas de ejemplo']] as const){const item=ingredients[i],sequence=movements.length+1;movements.push({id:`DEMO-MOV-${sequence}`,sequence,ingredientId:item.id,label:ingredientLabel(item),unit:item.unit,kind,quantity,delta:after-before,before,after,at:new Date(now.getTime()-3600000+sequence*1000).toISOString(),reason,isDemo:true});}
  const recipe=(id:number,name:string,a:number,b:number,drinkId:string|null)=>({id:`DEMO-REC-${id}`,name,drinkId,lines:[{ingredientId:ingredients[a].id,quantity:1},{ingredientId:ingredients[b].id,quantity:1}],isDemo:true as const});
  return {ingredients,movements,recipes:[recipe(1,'Piscola',0,4,'admin-demo-drink-001'),recipe(2,'Ron Cola',1,4,'admin-demo-drink-005'),recipe(3,'Gin Tonic',3,6,'admin-demo-drink-002'),recipe(4,'Vodka Sprite',2,5,null)]};
}
