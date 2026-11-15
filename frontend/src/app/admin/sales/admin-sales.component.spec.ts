import { CommonModule, registerLocaleData } from '@angular/common';
import esCl from '@angular/common/locales/es-CL';
import { ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AdminIconComponent } from '../admin-icon.component';
import { AdminSalePanelComponent } from './admin-sale-panel.component';
import { AdminSalesListComponent } from './admin-sales-list.component';
import { AdminSalesComponent } from './admin-sales.component';
import { AdminSaleDetailComponent } from './admin-sale-detail.component';
import { AdminSaleStatusComponent } from './admin-sale-status.component';
import { AdminSalesSummaryComponent } from './admin-sales-summary.component';
import { AdminSalesService } from './admin-sales.service';
registerLocaleData(esCl);
describe('Admin sales presentation',()=>{
 const route=(params={},query={})=>({paramMap:of(convertToParamMap(params)),snapshot:{queryParamMap:convertToParamMap(query)}});
 beforeEach(async()=>{
  await TestBed.configureTestingModule({imports:[CommonModule,ReactiveFormsModule,RouterTestingModule],declarations:[AdminIconComponent,AdminSalePanelComponent,AdminSalesListComponent,AdminSalesComponent,AdminSaleDetailComponent,AdminSaleStatusComponent,AdminSalesSummaryComponent],providers:[{provide:AdminSalesService,useFactory:()=>new AdminSalesService(()=>new Date('2026-11-14T16:00:00Z'))},{provide:ActivatedRoute,useValue:route()}]}).compileComponents();
 });
 it('renders five orders, both financial and operational columns, labels and detail links',()=>{
  spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);const f=TestBed.createComponent(AdminSalesComponent);f.detectChanges();const root=f.nativeElement as HTMLElement;expect(root.querySelectorAll('tbody tr').length).toBe(5);expect(root.textContent).toContain('$69.000');expect(root.textContent).toContain('$34.500');expect(root.textContent).toContain('Estado de entrega');expect(root.querySelectorAll('.detail-link').length).toBe(5);expect(root.querySelector('button[type=submit]')).toBeNull();
 });
 it('updates combined controls, shows an empty state and clears to today',()=>{
  spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);const f=TestBed.createComponent(AdminSalesComponent);f.detectChanges();f.componentInstance.form.patchValue({period:'week',type:'mixed',payment:'approved'});f.detectChanges();expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(1);expect(f.nativeElement.textContent).toContain('$29.000');f.componentInstance.form.controls.search.setValue('missing');f.detectChanges();expect(f.nativeElement.textContent).toContain('No encontramos pedidos');(f.nativeElement.querySelector('.empty button') as HTMLButtonElement).click();f.detectChanges();expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
 });
 it('exposes accessible custom range errors and restores a valid same-day range',()=>{
  spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);const f=TestBed.createComponent(AdminSalesComponent);f.detectChanges();f.componentInstance.form.patchValue({period:'custom',from:'2026-11-15',to:'2026-11-14'});f.detectChanges();expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();expect(f.nativeElement.querySelector('#sales-from').getAttribute('aria-invalid')).toBe('true');f.componentInstance.form.controls.from.setValue('2026-11-14');f.detectChanges();expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
 });
 it('restores whitelisted query filters and ignores unknown enum values',()=>{
  TestBed.overrideProvider(ActivatedRoute,{useValue:route({},{period:'week',type:'mixed',payment:'approved',order:'invalid'})});spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);const f=TestBed.createComponent(AdminSalesComponent);f.detectChanges();expect(f.componentInstance.form.controls.order.value).toBe('date-desc');expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
 });
 it('renders quantities, unit amounts, totals, timeline and approved but pending delivery',()=>{
  TestBed.overrideProvider(ActivatedRoute,{useValue:route({id:'DEMO-ORD-0001'})});spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);const f=TestBed.createComponent(AdminSaleDetailComponent);f.detectChanges();const root=f.nativeElement as HTMLElement;expect(root.querySelectorAll('.items li').length).toBe(2);expect(root.querySelector('.quantity')?.textContent).toBe('×2');expect(root.querySelector('.unit-price')?.textContent).toBe('$12.000 c/u');expect(root.querySelectorAll('.unit-price')[1].textContent).toBe('$25.000 c/u');expect(root.querySelector('.totals')?.textContent).toContain('$49.000');expect(root.querySelectorAll('.timeline li').length).toBe(3);expect(root.querySelector('[data-status=approved]')?.textContent).toBe('Aprobado');expect(root.querySelector('[data-status=pending]')?.textContent).toBe('Pendiente');expect(root.querySelector('button')).toBeNull();
 });
 it('shows a controlled missing order state and return link',()=>{
  TestBed.overrideProvider(ActivatedRoute,{useValue:route({id:'unknown'})});spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);const f=TestBed.createComponent(AdminSaleDetailComponent);f.detectChanges();expect(f.nativeElement.textContent).toContain('Pedido no encontrado');expect(f.nativeElement.querySelector('.missing a')).toBeTruthy();
 });
 it('selects periods with accessible buttons and resets the open detail after filtering',()=>{
  spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);const f=TestBed.createComponent(AdminSalesComponent);f.detectChanges();
  (f.nativeElement.querySelector('#period-week') as HTMLButtonElement).click();f.detectChanges();expect(f.componentInstance.form.controls.period.value).toBe('week');expect(f.nativeElement.querySelector('#period-week').getAttribute('aria-pressed')).toBe('true');
  (f.nativeElement.querySelector('.detail-link') as HTMLButtonElement).click();f.detectChanges();expect(f.componentInstance.selectedId).toBeTruthy();f.componentInstance.form.controls.payment.setValue('pending');f.detectChanges();expect(f.componentInstance.selectedId).toBeNull();expect(f.nativeElement.querySelector('app-admin-sale-panel')).toBeNull();
 });
 it('opens an inline detail without navigating, closes it, and retains query filters',()=>{
  const navigate=spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);const f=TestBed.createComponent(AdminSalesComponent);f.detectChanges();navigate.calls.reset();const button=f.nativeElement.querySelector('.detail-link') as HTMLButtonElement;button.click();f.detectChanges();expect(navigate).not.toHaveBeenCalled();expect(button.getAttribute('aria-expanded')).toBe('true');expect(f.nativeElement.querySelector('#desktop-order-detail')).toBeTruthy();expect(f.nativeElement.querySelector('#mobile-order-detail')).toBeTruthy();(f.nativeElement.querySelector('.close-panel') as HTMLButtonElement).click();f.detectChanges();expect(button.getAttribute('aria-expanded')).toBe('false');expect(f.nativeElement.querySelector('app-admin-sale-panel')).toBeNull();
 });
 it('toggles the mobile card detail independently while keeping other cards collapsed',()=>{
  spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);const f=TestBed.createComponent(AdminSalesComponent);f.detectChanges();const buttons=f.nativeElement.querySelectorAll('.card-toggle') as NodeListOf<HTMLButtonElement>;buttons[0].click();f.detectChanges();expect(f.nativeElement.querySelectorAll('.sale-card app-admin-sale-panel').length).toBe(1);buttons[1].click();f.detectChanges();expect(buttons[0].getAttribute('aria-expanded')).toBe('false');expect(buttons[1].getAttribute('aria-expanded')).toBe('true');buttons[1].click();f.detectChanges();expect(f.componentInstance.selectedId).toBeNull();
 });

});
