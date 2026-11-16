export type IngredientKind = 'alcohol' | 'beverage';
export type InventoryUnit = 'glass' | 'portion' | 'unit';
export type StockStatus = 'available' | 'low' | 'out';
export interface IngredientDraft { name:string; brand:string; kind:IngredientKind; unit:InventoryUnit; minimum:number; enabled:boolean; }
export interface Ingredient extends IngredientDraft { id:string; isDemo:true; }
export type MovementKind = 'initial' | 'in' | 'out' | 'loss' | 'adjustment';
export interface InventoryMovement { id:string; sequence:number; ingredientId:string; label:string; unit:InventoryUnit; kind:MovementKind; quantity:number; delta:number; at:string; reason:string; before:number; after:number; isDemo:true; }
export interface RecipeLine { ingredientId:string; quantity:number; }
export interface RecipeDraft { name:string; drinkId:string|null; lines:RecipeLine[]; }
export interface InventoryRecipe extends RecipeDraft { id:string; isDemo:true; }
export interface InventoryState { ingredients:Ingredient[]; movements:InventoryMovement[]; recipes:InventoryRecipe[]; }
export interface StockRow extends Ingredient { stock:number; status:StockStatus; label:string; }
export interface InventorySummary { alcohols:number; beverages:number; low:number; out:number; }
export interface RecipeCapacity { possible:number; valid:boolean; limiting:string[]; reason:string; }
export const MOVEMENT_LABELS:Record<MovementKind,string>={initial:'Inicial',in:'Ingreso',out:'Salida',loss:'Merma',adjustment:'Ajuste'};
export const STATUS_LABELS:Record<StockStatus,string>={available:'Disponible',low:'Stock bajo',out:'Agotado'};
