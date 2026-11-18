import { SharedPresentationModule } from '../../shared/shared-presentation.module';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { AdminDrinkFormComponent } from './admin-drink-form.component';
import { AdminDrinksService } from './admin-drinks.service';
import { ADMIN_DEMO_DRINKS } from './admin-drinks.data';
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOY6XL3PwAF7gK6caozUAAAAABJRU5ErkJggg==';
describe('Admin drink form',()=>{
  let component:AdminDrinkFormComponent,service:AdminDrinksService;
  beforeEach(async()=>{await TestBed.configureTestingModule({imports:[SharedPresentationModule,CommonModule,ReactiveFormsModule,RouterTestingModule],declarations:[AdminDrinkFormComponent],providers:[AdminDrinksService,{provide:ActivatedRoute,useValue:{paramMap:of(convertToParamMap({}))}}]}).compileComponents();service=TestBed.inject(AdminDrinksService);component=TestBed.createComponent(AdminDrinkFormComponent).componentInstance;});
  it('rejects empty required fields, missing photo and invalid price',()=>{
    const save=spyOn(service,'save');component.save();expect(save).not.toHaveBeenCalled();expect(component.error).toContain('Revisa');expect(component.form.controls.name.touched).toBeTrue();
    component.form.patchValue({...ADMIN_DEMO_DRINKS[0],priceClp:-1});expect(component.form.invalid).toBeTrue();component.form.controls.priceClp.setValue(0);expect(component.form.valid).toBeTrue();
  });
  it('saves a valid product and returns to the list with a confirmation',async()=>{
    component.form.patchValue({...ADMIN_DEMO_DRINKS[0],name:'Variante'});const navigate=spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);component.save();expect((await firstValueFrom(service.drinks$)).length).toBe(6);expect(await firstValueFrom(service.message$)).toContain('Variante');expect(navigate).toHaveBeenCalledWith(['/admin/tragos']);expect(component.hasUnsavedChanges).toBeFalse();
  });
  it('loads an existing product and editing does not mutate it before save',async()=>{
    const route={paramMap:of(convertToParamMap({id:'admin-demo-drink-001'}))} as unknown as ActivatedRoute;const edit=new AdminDrinkFormComponent(service,route,TestBed.inject(Router));edit.form.controls.priceClp.setValue(9000);expect((await firstValueFrom(service.drinks$))[0].priceClp).toBe(5000);edit.ngOnDestroy();
  });
  it('refreshes data when the same editor is reused with another ID',()=>{
    const params=new BehaviorSubject(convertToParamMap({id:'admin-demo-drink-001'}));const edit=new AdminDrinkFormComponent(service,{paramMap:params} as unknown as ActivatedRoute,TestBed.inject(Router));expect(edit.form.controls.name.value).toBe('Piscola');params.next(convertToParamMap({id:'admin-demo-drink-002'}));expect(edit.form.controls.name.value).toBe('Gin Tonic');expect(edit.hasUnsavedChanges).toBeFalse();edit.ngOnDestroy();
  });
  it('shows a controlled missing-record state after a lost ID',()=>{const edit=new AdminDrinkFormComponent(service,{paramMap:of(convertToParamMap({id:'missing'}))} as unknown as ActivatedRoute,TestBed.inject(Router));expect(edit.missing).toBeTrue();edit.ngOnDestroy();});
  it('asks before discarding unsaved changes and guards reload',()=>{
    component.form.controls.name.setValue('Pendiente');const confirm=spyOn(window,'confirm').and.returnValue(false);expect(component.confirmLeave()).toBeFalse();confirm.and.returnValue(true);expect(component.confirmLeave()).toBeTrue();const event={preventDefault:jasmine.createSpy(),returnValue:undefined} as unknown as BeforeUnloadEvent;component.beforeUnload(event);expect(event.preventDefault).toHaveBeenCalled();
  });
  it('rejects an invalid image and retains the existing photograph',async()=>{
    component.form.controls.image.setValue('assets/drinks/piscola.jpg');const input={files:[new File(['<svg/>'],'fake.svg',{type:'image/svg+xml'})],value:'fake'};await component.onImageSelected({target:input} as unknown as Event);expect(component.imageError).toContain('JPG, PNG o WEBP');expect(component.form.controls.image.value).toBe('assets/drinks/piscola.jpg');expect(component.imageLoading).toBeFalse();
  });
  it('loads a valid local PNG into the preview form control',async()=>{
    const bytes=Uint8Array.from(atob(PNG),char=>char.charCodeAt(0));const input={files:[new File([bytes],'photo.png',{type:'image/png'})],value:'photo.png'};
    await component.onImageSelected({target:input} as unknown as Event);expect(component.form.controls.image.value).toBe('data:image/png;base64,'+PNG);expect(component.form.controls.image.valid).toBeTrue();expect(component.imageLoading).toBeFalse();
  });
  it('does not apply a delayed image result to a destroyed editor',async()=>{
    const bytes=Uint8Array.from(atob(PNG),char=>char.charCodeAt(0));const read=component.onImageSelected({target:{files:[new File([bytes],'photo.png',{type:'image/png'})],value:'photo.png'}} as unknown as Event);
    component.ngOnDestroy();await read;expect(component.form.controls.image.value).toBe('');
  });

});
