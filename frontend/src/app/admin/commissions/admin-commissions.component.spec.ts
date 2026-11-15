import { CommonModule, registerLocaleData } from '@angular/common';
import esCl from '@angular/common/locales/es-CL';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AdminIconComponent } from '../admin-icon.component';
import { AdminSaleStatusComponent } from '../sales/admin-sale-status.component';
import { AdminSalesService } from '../sales/admin-sales.service';
import { AdminCommissionsComponent } from './admin-commissions.component';
import { AdminCommissionSettingsComponent } from './admin-commission-settings.component';
import { AdminCommissionSummaryComponent } from './admin-commission-summary.component';
import { AdminCommissionListComponent } from './admin-commission-list.component';
import { AdminCommissionDetailComponent } from './admin-commission-detail.component';
import { AdminCommissionsService } from './admin-commissions.service';
import { DEFAULT_COMMISSION_CONFIG } from './admin-commission.model';
import { firstValueFrom } from 'rxjs';
registerLocaleData(esCl);
describe('Admin commissions presentation DEMO',()=>{
 beforeEach(async()=>{
  await TestBed.configureTestingModule({imports:[CommonModule,ReactiveFormsModule,RouterTestingModule],declarations:[AdminCommissionsComponent,AdminCommissionSettingsComponent,AdminCommissionSummaryComponent,AdminCommissionListComponent,AdminCommissionDetailComponent,AdminIconComponent,AdminSaleStatusComponent],providers:[AdminCommissionsService,{provide:AdminSalesService,useFactory:()=>new AdminSalesService(()=>new Date('2026-11-15T16:00:00Z'))},{provide:ActivatedRoute,useValue:{snapshot:{queryParamMap:convertToParamMap({})}}}]}).compileComponents();
 });
 const page=():ComponentFixture<AdminCommissionsComponent>=>{spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);const f=TestBed.createComponent(AdminCommissionsComponent);f.detectChanges();return f;};
 it('renders four consistent KPIs, applied parameters and first five of ten operations',()=>{
  const f=page(),root=f.nativeElement as HTMLElement;expect(root.querySelectorAll('.metrics article').length).toBe(4);expect(root.textContent).toContain('$156.000');expect(root.textContent).toContain('$7.800');expect(root.textContent).toContain('$4.524');expect(root.textContent).toContain('$143.676');expect(root.querySelectorAll('tr.operation').length).toBe(5);expect(root.textContent).toContain('de 10 operaciones');expect(root.querySelector('#finance-period-week')?.getAttribute('aria-pressed')).toBe('true');
 });
 it('applies reference/status filters, empty/clear and resets pagination',()=>{
  const f=page();f.componentInstance.form.patchValue({search:'0006',payment:'approved'});f.detectChanges();expect(f.nativeElement.querySelectorAll('tr.operation').length).toBe(1);expect(f.nativeElement.textContent).toContain('$26.709');f.componentInstance.form.controls.search.setValue('missing');f.detectChanges();expect(f.nativeElement.textContent).toContain('No encontramos operaciones');(f.nativeElement.querySelector('.empty button') as HTMLButtonElement).click();f.detectChanges();expect(f.nativeElement.querySelectorAll('tr.operation').length).toBe(5);
  (f.nativeElement.querySelector('[aria-label="Página siguiente"]') as HTMLButtonElement).click();f.detectChanges();expect(f.nativeElement.textContent).toContain('Mostrando 6–10');f.componentInstance.clear();f.detectChanges();expect(f.nativeElement.textContent).toContain('Mostrando 1–5');
 });
 it('opens a financial detail inline with products, VAT explanation and independent states',()=>{
  const f=page();f.componentInstance.form.controls.search.setValue('0002');f.detectChanges();const button=f.nativeElement.querySelector('.operation-toggle') as HTMLButtonElement;button.click();f.detectChanges();expect(button.getAttribute('aria-expanded')).toBe('true');const detail=f.nativeElement.querySelector('#financial-desktop-detail') as HTMLElement;expect(detail.textContent).toContain('IVA DEMO');expect(detail.textContent).toContain('$1.000');expect(detail.textContent).toContain('$580');expect(detail.textContent).toContain('$18.420');expect(detail.querySelector('[data-status=approved]')).toBeTruthy();expect(detail.querySelector('[data-status=partial]')).toBeTruthy();expect(detail.querySelector('.items')?.textContent).toContain('2 × Piscola');button.click();f.detectChanges();expect(button.getAttribute('aria-expanded')).toBe('false');expect(f.nativeElement.querySelector('app-admin-commission-detail')).toBeNull();
 });
 it('keeps pending amounts excluded, shows range errors and disables CSV for invalid selections',()=>{
  const f=page();f.componentInstance.form.controls.payment.setValue('pending');f.detectChanges();expect(f.nativeElement.querySelector('.metrics')?.textContent).not.toContain('$156.000');expect(f.nativeElement.textContent).toContain('2 pendientes');f.componentInstance.form.patchValue({period:'custom',from:'2026-11-16',to:'2026-11-15'});f.detectChanges();expect(f.nativeElement.querySelector('#finance-error')).toBeTruthy();expect((f.nativeElement.querySelector('#export-commissions') as HTMLButtonElement).disabled).toBeTrue();expect(f.nativeElement.querySelector('#finance-from').getAttribute('aria-invalid')).toBe('true');
 });
 it('validates config drafts before applying and persists only valid applied settings in the service',()=>{
  const f=TestBed.createComponent(AdminCommissionSettingsComponent);f.detectChanges();const s=TestBed.inject(AdminCommissionsService);f.componentInstance.form.controls.codetecRate.setValue(1.234);f.componentInstance.apply();f.detectChanges();expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();expect(s.config.codetecBps).toBe(500);f.componentInstance.form.controls.codetecRate.setValue(10);f.componentInstance.apply();f.detectChanges();expect(s.config.codetecBps).toBe(1000);expect(f.nativeElement.querySelector('.feedback').textContent).toContain('aplicada');const other=TestBed.createComponent(AdminCommissionSettingsComponent);expect(other.componentInstance.form.controls.codetecRate.value).toBe(10);f.componentInstance.reset();expect(s.config).toEqual(DEFAULT_COMMISSION_CONFIG);
 });
 it('supports fixed costs and ignores invalid inactive percentage drafts when changing modes',()=>{
  const f=TestBed.createComponent(AdminCommissionSettingsComponent);f.detectChanges();const c=f.componentInstance;c.form.controls.processorRate.setValue(1.234);c.form.controls.processorMode.setValue('fixed');c.form.controls.processorFixed.setValue(200);c.apply();f.detectChanges();expect(TestBed.inject(AdminCommissionsService).config.processorFixedClp).toBe(200);expect(f.nativeElement.querySelector('#processor-fixed')).toBeTruthy();expect(f.nativeElement.querySelector('#processor-rate')).toBeNull();c.form.controls.processorFixed.setValue(1.5);c.form.controls.processorMode.setValue('percent');c.form.controls.processorRate.setValue(0);c.apply();expect(TestBed.inject(AdminCommissionsService).config.processorBps).toBe(0);
 });
 it('exports a local CSV Blob with DEMO filename then revokes the URL',fakeAsync(()=>{
  const f=page();const create=spyOn(URL,'createObjectURL').and.returnValue('blob:demo-void');const revoke=spyOn(URL,'revokeObjectURL');const click=spyOn(HTMLAnchorElement.prototype,'click');let report:any;f.componentInstance.report$.subscribe(r=>report=r).unsubscribe();f.componentInstance.export(report);expect(create).toHaveBeenCalled();expect((create.calls.mostRecent().args[0] as Blob).type).toBe('text/csv;charset=utf-8');expect(click).toHaveBeenCalled();expect(f.componentInstance.exportMessage).toContain('CSV DEMO');tick(1000);expect(revoke).toHaveBeenCalledWith('blob:demo-void');
 }));
 it('keeps a local settings change out of the report until Apply',async()=>{
  const f=TestBed.createComponent(AdminCommissionSettingsComponent);f.detectChanges();const s=TestBed.inject(AdminCommissionsService);f.componentInstance.form.controls.codetecRate.setValue(25);expect(s.config.codetecBps).toBe(500);f.componentInstance.apply();expect(s.config.codetecBps).toBe(2500);const report=await firstValueFrom(s.report({period:'today',from:'',to:'',payment:'',search:'',order:'date-desc'}));expect(report.summary.codetecClp).toBe(17250);
 });
});
