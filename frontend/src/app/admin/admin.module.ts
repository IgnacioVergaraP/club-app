import { AdminStaffComponent } from './staff/admin-staff.component';
import { AdminStaffFormComponent } from './staff/admin-staff-form.component';
import { AdminStaffListComponent } from './staff/admin-staff-list.component';
import { AdminStaffDetailComponent } from './staff/admin-staff-detail.component';
import { AdminStaffSummaryComponent } from './staff/admin-staff-summary.component';
import { AdminStaffRoleComponent, AdminStaffStatusComponent } from './staff/admin-staff-badges.component';
import { AdminStaffService } from './staff/admin-staff.service';
import { adminStaffUnsavedGuard } from './staff/admin-staff-unsaved.guard';
import { AdminCommissionsComponent } from './commissions/admin-commissions.component';
import { AdminCommissionSettingsComponent } from './commissions/admin-commission-settings.component';
import { AdminCommissionSummaryComponent } from './commissions/admin-commission-summary.component';
import { AdminCommissionListComponent } from './commissions/admin-commission-list.component';
import { AdminCommissionDetailComponent } from './commissions/admin-commission-detail.component';
import { AdminCommissionsService } from './commissions/admin-commissions.service';
import { AdminSalePanelComponent } from './sales/admin-sale-panel.component';
import { AdminSalesListComponent } from './sales/admin-sales-list.component';
import { AdminSalesComponent } from './sales/admin-sales.component';
import { AdminSaleDetailComponent } from './sales/admin-sale-detail.component';
import { AdminSaleStatusComponent } from './sales/admin-sale-status.component';
import { AdminSalesSummaryComponent } from './sales/admin-sales-summary.component';
import { AdminSalesService } from './sales/admin-sales.service';
import { NgModule } from '@angular/core';
import localeEsCl from '@angular/common/locales/es-CL';
import { registerLocaleData } from '@angular/common';
import { AdminDrinksComponent } from './drinks/admin-drinks.component';
import { AdminDrinkRowComponent } from './drinks/admin-drink-row.component';
import { AdminDrinkFormComponent } from './drinks/admin-drink-form.component';
import { AdminDrinksService } from './drinks/admin-drinks.service';
import { adminDrinkUnsavedGuard } from './drinks/admin-drink-unsaved.guard';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminEventsComponent } from './events/admin-events.component';
import { AdminEventFormComponent } from './events/admin-event-form.component';
import { AdminEventDetailComponent } from './events/admin-event-detail.component';
import { AdminEventProgressComponent } from './events/admin-event-progress.component';
import { AdminEventPreviewComponent } from './events/admin-event-preview.component';
import { AdminEventTicketsComponent } from './events/admin-event-tickets.component';
import { adminEventUnsavedGuard } from './events/admin-event-unsaved.guard';
import { AdminEventsService } from './events/admin-events.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminPlaceholderComponent } from './admin-placeholder.component';
import { AdminOverviewComponent } from './admin-overview.component';
import { AdminIconComponent } from './admin-icon.component';
import { AdminDemoService } from './admin-demo.service';

registerLocaleData(localeEsCl);

@NgModule({
  declarations: [AdminStaffComponent, AdminStaffFormComponent, AdminStaffListComponent, AdminStaffDetailComponent, AdminStaffSummaryComponent, AdminStaffRoleComponent, AdminStaffStatusComponent, AdminCommissionsComponent, AdminCommissionSettingsComponent, AdminCommissionSummaryComponent, AdminCommissionListComponent, AdminCommissionDetailComponent, AdminSalePanelComponent, AdminSalesListComponent, AdminSalesComponent, AdminSaleDetailComponent, AdminSaleStatusComponent, AdminSalesSummaryComponent, AdminDrinksComponent,AdminDrinkRowComponent,AdminDrinkFormComponent,AdminEventProgressComponent,AdminEventPreviewComponent, AdminEventTicketsComponent,AdminEventsComponent, AdminEventFormComponent, AdminEventDetailComponent, AdminOverviewComponent, AdminIconComponent, AdminLayoutComponent, AdminDashboardComponent, AdminPlaceholderComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule.forChild([{ path: '', component: AdminLayoutComponent, children: [
    { path: '', component: AdminDashboardComponent, pathMatch: 'full' },
    { path: 'eventos', component: AdminEventsComponent },
    { path: 'eventos/nuevo', component: AdminEventFormComponent, canDeactivate:[adminEventUnsavedGuard] },
    { path: 'eventos/:id/editar', component: AdminEventFormComponent, canDeactivate:[adminEventUnsavedGuard] },
    { path: 'eventos/:id', component: AdminEventDetailComponent },
    {path:'tragos',component:AdminDrinksComponent},
    {path:'tragos/nuevo',component:AdminDrinkFormComponent,canDeactivate:[adminDrinkUnsavedGuard]},
    {path:'tragos/:id/editar',component:AdminDrinkFormComponent,canDeactivate:[adminDrinkUnsavedGuard]},
    {path:'ventas',component:AdminSalesComponent},
    {path:'ventas/:id',component:AdminSaleDetailComponent},
    {path:'comisiones',component:AdminCommissionsComponent},
    {path:'personal',component:AdminStaffComponent},
    {path:'personal/nuevo',component:AdminStaffFormComponent,canDeactivate:[adminStaffUnsavedGuard]},
    {path:'personal/:id/editar',component:AdminStaffFormComponent,canDeactivate:[adminStaffUnsavedGuard]},
    ...[['configuracion','Configuración']].map(([path,title]) => ({path, component: AdminPlaceholderComponent, data: {title}})),
    { path: '**', redirectTo: '' }
  ] }])],
  providers: [AdminDemoService, AdminEventsService, AdminDrinksService, AdminSalesService, AdminCommissionsService, AdminStaffService]
})
export class AdminModule {}
