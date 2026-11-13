import { NgModule } from '@angular/core';
import localeEsCl from '@angular/common/locales/es-CL';
import { registerLocaleData } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminEventsComponent } from './events/admin-events.component';
import { AdminEventFormComponent } from './events/admin-event-form.component';
import { AdminEventDetailComponent } from './events/admin-event-detail.component';
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
  declarations: [AdminEventsComponent, AdminEventFormComponent, AdminEventDetailComponent, AdminOverviewComponent, AdminIconComponent, AdminLayoutComponent, AdminDashboardComponent, AdminPlaceholderComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule.forChild([{ path: '', component: AdminLayoutComponent, children: [
    { path: '', component: AdminDashboardComponent, pathMatch: 'full' },
    { path: 'eventos', component: AdminEventsComponent },
    { path: 'eventos/nuevo', component: AdminEventFormComponent },
    { path: 'eventos/:id/editar', component: AdminEventFormComponent },
    { path: 'eventos/:id', component: AdminEventDetailComponent },
    ...[['tragos','Tragos'],['ventas','Ventas'],['comisiones','Comisiones'],['personal','Personal'],['configuracion','Configuración']].map(([path,title]) => ({path, component: AdminPlaceholderComponent, data: {title}})),
    { path: '**', redirectTo: '' }
  ] }])],
  providers: [AdminDemoService, AdminEventsService]
})
export class AdminModule {}
