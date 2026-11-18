import { SharedPresentationModule } from '../../shared/shared-presentation.module';
import { CommonModule, registerLocaleData } from '@angular/common';
import esCl from '@angular/common/locales/es-CL';
import { ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { firstValueFrom, of } from 'rxjs';
import { AdminIconComponent } from '../admin-icon.component';
import { AdminDrinkRowComponent } from './admin-drink-row.component';
import { AdminDrinksComponent } from './admin-drinks.component';
import { AdminDrinksService } from './admin-drinks.service';
registerLocaleData(esCl);
describe('Admin drinks list',()=>{
  const router={navigate:()=>Promise.resolve(true)} as unknown as Router;
  it('combines search/category/availability and resets empty matches',async()=>{
    const component=new AdminDrinksComponent(new AdminDrinksService(),router);component.search.setValue('ron');component.category.setValue('clasicos');component.availability.setValue('unavailable');
    expect((await firstValueFrom(component.view$)).drinks[0].name).toBe('Ron Cola');component.availability.setValue('available');expect((await firstValueFrom(component.view$)).drinks.length).toBe(0);component.clearFilters();expect((await firstValueFrom(component.view$)).drinks.length).toBe(5);
  });
  it('orders both price and name in both directions',async()=>{
    const component=new AdminDrinksComponent(new AdminDrinksService(),router);expect((await firstValueFrom(component.view$)).drinks[0].name).toBe('Gin Tonic');component.order.setValue('name-desc');expect((await firstValueFrom(component.view$)).drinks[0].name).toBe('Ron Cola');
    component.order.setValue('price-asc');expect((await firstValueFrom(component.view$)).drinks[0].priceClp).toBe(5000);component.order.setValue('price-desc');expect((await firstValueFrom(component.view$)).drinks[0].priceClp).toBe(7000);
  });
  it('duplicates and opens the editor for the new variant',async()=>{
    const service=new AdminDrinksService();const component=new AdminDrinksComponent(service,router);const navigate=spyOn(router,'navigate').and.resolveTo(true);component.duplicate((await firstValueFrom(service.drinks$))[0]);expect(navigate).toHaveBeenCalledWith(['/admin/tragos','admin-demo-drink-006','editar']);
  });
  beforeEach(async()=>{await TestBed.configureTestingModule({imports:[SharedPresentationModule,CommonModule,ReactiveFormsModule,RouterTestingModule],declarations:[AdminDrinksComponent,AdminDrinkRowComponent,AdminIconComponent],providers:[AdminDrinksService]}).compileComponents();});
  it('renders a distinct initial empty state',()=>{
    TestBed.overrideProvider(AdminDrinksService,{useValue:{drinks$:of([]),message$:of('')}});const fixture=TestBed.createComponent(AdminDrinksComponent);fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Tu carta está vacía');expect(fixture.nativeElement.querySelector('a.primary')).toBeTruthy();
  });
  it('renders no results and a clear-filter action',()=>{
    const fixture=TestBed.createComponent(AdminDrinksComponent);fixture.componentInstance.search.setValue('no existe');fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('No encontramos tragos');fixture.componentInstance.clearFilters();fixture.detectChanges();expect(fixture.nativeElement.querySelectorAll('.drink-row').length).toBe(5);
  });
  it('keeps the focused availability control while updating its label and pressed state',()=>{
    const fixture=TestBed.createComponent(AdminDrinksComponent);fixture.detectChanges();const button=fixture.nativeElement.querySelector('.availability') as HTMLButtonElement;button.focus();button.click();fixture.detectChanges();expect(fixture.nativeElement.querySelector('.availability')).toBe(button);expect(button.getAttribute('aria-pressed')).toBe('false');expect(button.textContent).toContain('No disponible');
  });
});
