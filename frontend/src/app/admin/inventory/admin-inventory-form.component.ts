import { Component, inject } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, take } from 'rxjs';
import { AdminInventoryService } from './admin-inventory.service';
import { InventoryFormBase } from './inventory-form.base';
import { IngredientDraft, IngredientKind, InventoryUnit, MovementKind, RecipeDraft, StockRow } from './inventory.model';
import { ingredientLabel, recipeCapacity, validateIngredient, validateRecipe, whole, unitWord } from './inventory.rules';
const integer=(min=0)=>(c:AbstractControl)=>whole(c.value,min)?null:{integer:true};
const line=(ingredientId='',quantity=1)=>new FormGroup({ingredientId:new FormControl(ingredientId,{nonNullable:true,validators:[Validators.required]}),quantity:new FormControl(quantity,{nonNullable:true,validators:[integer(1)]})});
@Component({selector:'app-admin-inventory-form',standalone:false,templateUrl:'./admin-inventory-form.component.html',styleUrls:['./inventory.shared.scss','./inventory-form.scss']})
export class AdminInventoryFormComponent extends InventoryFormBase {
  readonly service=inject(AdminInventoryService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);
  mode='ingredient';id:string|undefined;missing=false;rows:StockRow[]=[];catalog:{id:string;name:string}[]=[];returnView='alcohols';submitted=false;
  readonly unitWord=unitWord;
  readonly ingredient=new FormGroup({name:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(80)]}),brand:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(80)]}),kind:new FormControl<IngredientKind>('alcohol',{nonNullable:true}),unit:new FormControl<InventoryUnit>('glass',{nonNullable:true}),minimum:new FormControl(0,{nonNullable:true,validators:[integer()]}),enabled:new FormControl(true,{nonNullable:true}),initial:new FormControl(0,{nonNullable:true,validators:[integer()]})});
  readonly movement=new FormGroup({ingredientId:new FormControl('',{nonNullable:true,validators:[Validators.required]}),kind:new FormControl<Exclude<MovementKind,'initial'>>('in',{nonNullable:true}),quantity:new FormControl(1,{nonNullable:true,validators:[c=>whole(Math.abs(c.value),1)?null:{integer:true}]}),reason:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.minLength(3),Validators.maxLength(240)]})});
  readonly recipe=new FormGroup({name:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(80)]}),drinkId:new FormControl('',{nonNullable:true}),lines:new FormArray([line()])});
  get form():FormGroup{return this.mode==='ingredient'?this.ingredient:this.mode==='movement'?this.movement:this.recipe;}
  get selected(){return this.rows.find(r=>r.id===this.movement.controls.ingredientId.value);}
  get after(){const m=this.movement.getRawValue();return (this.selected?.stock||0)+(m.kind==='out'||m.kind==='loss'?-m.quantity:m.quantity);}
  get label(){try{return ingredientLabel(this.ingredient.getRawValue());}catch{return '';}}
  get capacity(){return recipeCapacity(this.recipeDraft(),this.rows);}
  get title(){return this.mode==='ingredient'?(this.id?'Editar ingrediente':'Nuevo ingrediente'):this.mode==='movement'?'Registrar movimiento':this.id?'Editar receta':'Nueva receta';}
  constructor(){super();combineLatest([this.route.paramMap,this.route.data,this.route.queryParamMap]).pipe(takeUntilDestroyed()).subscribe(([params,data,query])=>{
    this.mode=data['mode'];this.id=params.get('id')||undefined;this.missing=false;this.error='';this.submitted=false;
    this.returnView=this.mode==='recipe'?'recipes':this.mode==='movement'?(['alcohols','beverages'].includes(query.get('view')||'')?query.get('view')!:'movements'):query.get('kind')==='beverage'?'beverages':'alcohols';
    this.service.view$.pipe(take(1)).subscribe(vm=>{this.rows=vm.rows;this.catalog=vm.catalog;
      if(this.mode==='ingredient') {const item=vm.ingredients.find(i=>i.id===this.id);this.missing=!!this.id&&!item;this.ingredient.reset(item?{...item,initial:0}:{name:'',brand:'',kind:query.get('kind')==='beverage'?'beverage':'alcohol',unit:query.get('kind')==='beverage'?'unit':'glass',minimum:0,enabled:true,initial:0});if(item)this.returnView=item.kind==='alcohol'?'alcohols':'beverages';}
      if(this.mode==='movement')this.movement.reset({ingredientId:query.get('ingredient')||'',kind:'in',quantity:1,reason:''});
      if(this.mode==='recipe'){const item=vm.recipes.find(r=>r.id===this.id);this.missing=!!this.id&&!item;this.recipe.reset({name:item?.name||'',drinkId:item?.drinkId||''});this.recipe.controls.lines.clear();for(const l of item?.lines||[{ingredientId:'',quantity:1}])this.recipe.controls.lines.push(line(l.ingredientId,l.quantity));}
      this.capture();
    });
  });}
  signature(){return JSON.stringify(this.form.getRawValue());}
  kindChanged(){if(!this.id)this.ingredient.controls.unit.setValue(this.ingredient.controls.kind.value==='beverage'?'unit':'glass');}
  addLine(){if(this.recipe.controls.lines.length<50)this.recipe.controls.lines.push(line());}
  removeLine(index:number){this.recipe.controls.lines.removeAt(index);}
  recipeDraft():RecipeDraft {const d=this.recipe.getRawValue();return {...d,drinkId:d.drinkId||null};}
  invalid(name:string){const c=this.form.get(name);return !!c?.invalid&&(c.touched||this.submitted);}
  save(){this.submitted=true;this.error='';this.form.markAllAsTouched();
    try{
      if(this.form.invalid)throw Error('Revisa los campos: usa cantidades enteras válidas y completa la información obligatoria.');
      if(this.mode==='ingredient'){const d=this.ingredient.getRawValue();validateIngredient(d);this.id=this.service.saveIngredient(d,this.id,d.initial);this.finish();}
      else if(this.mode==='movement'){const d=this.movement.getRawValue();this.service.recordMovement(d.ingredientId,d.kind,d.quantity,d.reason);this.finish();}
      else{const d=this.recipeDraft();validateRecipe(d,this.rows);this.service.saveRecipe(d,this.id).subscribe({next:id=>{this.id=id;this.finish();},error:e=>this.error=e.message});}
    }catch(e){this.error=(e as Error).message;}
  }
  private finish(){this.capture();void this.router.navigate(['/admin/inventario'],{queryParams:{view:this.returnView}});}
}
