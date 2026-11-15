import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { readAdminImage } from '../admin-image';
import { AdminDrinksService } from './admin-drinks.service';
import { AdminDrinkCategory, DRINK_CATEGORIES, DRINK_LIMITS } from './admin-drink.model';
import { drinkImageValidator, drinkPriceValidator, requiredDrinkName } from './admin-drink.validation';
@Component({selector:'app-admin-drink-form',standalone:false,templateUrl:'./admin-drink-form.component.html',styleUrls:['./admin-drink-form.component.scss']})
export class AdminDrinkFormComponent implements OnDestroy {
  @ViewChild('photoInput') private photoInput?:ElementRef<HTMLInputElement>;
  readonly categories=DRINK_CATEGORIES;readonly limits=DRINK_LIMITS;
  id?:string;missing=false;saving=false;imageLoading=false;imageError='';error='';
  private savedValue='';private imageRequest=0;private readonly destroyed$=new Subject<void>();
  readonly form=new FormGroup({
    name:new FormControl('',{nonNullable:true,validators:[requiredDrinkName,Validators.maxLength(DRINK_LIMITS.name)]}),
    description:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(DRINK_LIMITS.description)]}),
    category:new FormControl<AdminDrinkCategory>('clasicos',{nonNullable:true,validators:[Validators.required,control=>DRINK_CATEGORIES.some(item=>item.value===control.value)?null:{category:true}]}),
    priceClp:new FormControl<number|null>(null,{validators:[drinkPriceValidator]}),
    available:new FormControl(true,{nonNullable:true}),featured:new FormControl(false,{nonNullable:true}),
    image:new FormControl('',{nonNullable:true,validators:[drinkImageValidator]})
  });
  constructor(private readonly service:AdminDrinksService,private readonly route:ActivatedRoute,private readonly router:Router){
    this.route.paramMap.pipe(takeUntil(this.destroyed$)).subscribe(params=>{
      this.id=params.get('id')||undefined;this.missing=false;this.error='';this.imageError='';this.imageLoading=false;this.imageRequest++;
      if(this.photoInput)this.photoInput.nativeElement.value='';
      this.form.reset({name:'',description:'',category:'clasicos',priceClp:null,available:true,featured:false,image:''},{emitEvent:false});
      if(this.id)this.service.drinks$.pipe(take(1)).subscribe(drinks=>{const drink=drinks.find(item=>item.id===this.id);if(!drink){this.missing=true;return;}this.form.patchValue(drink,{emitEvent:false});});
      this.form.markAsPristine();this.savedValue=this.signature();
    });
    this.form.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe(()=>this.error='');
  }
  get categoryLabel():string{return this.categories.find(item=>item.value===this.form.controls.category.value)?.label||'';}
  get hasUnsavedChanges():boolean{return !this.missing&&(this.imageLoading||this.savedValue!==this.signature());}
  invalid(control:FormControl):boolean{return control.invalid&&control.touched;}
  async onImageSelected(event:Event):Promise<void>{
    const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;
    const request=++this.imageRequest;this.imageError='';this.imageLoading=true;
    try{const image=await readAdminImage(file);if(request===this.imageRequest){this.form.controls.image.setValue(image);this.form.controls.image.markAsDirty();}}
    catch(error){input.value='';if(request===this.imageRequest)this.imageError=(error as Error).message+(this.form.controls.image.valid?' Se conserva la fotografía anterior.':'');}
    finally{if(request===this.imageRequest)this.imageLoading=false;}
  }
  save():void{
    if(this.saving||this.imageLoading||this.missing)return;
    this.form.markAllAsTouched();this.error='';if(this.form.invalid){this.error='Revisa los campos marcados antes de guardar el trago DEMO.';return;}
    try{this.saving=true;const value=this.form.getRawValue();const saved=this.service.save({...value,priceClp:value.priceClp!},this.id);this.id=saved.id;this.savedValue=this.signature();void this.router.navigate(['/admin/tragos']).finally(()=>this.saving=false);}
    catch(error){this.saving=false;this.error=(error as Error).message;}
  }
  confirmLeave():boolean{return !this.hasUnsavedChanges||window.confirm('Tienes cambios de este trago sin guardar. ¿Quieres salir y descartarlos?');}
  @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent):void{if(this.hasUnsavedChanges){event.preventDefault();event.returnValue='';}}
  ngOnDestroy():void{this.imageRequest++;this.destroyed$.next();this.destroyed$.complete();}
  private signature():string{return JSON.stringify(this.form.getRawValue());}
}
