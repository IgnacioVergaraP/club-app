import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { InicioComponent } from './pages/inicio/inicio.component';
import { NochesComponent } from './pages/noches/noches.component';
import { EventDetailComponent } from './pages/event-detail/event-detail.component';
import { TragosComponent } from './pages/tragos/tragos.component';
import { WalletComponent } from './pages/wallet/wallet.component';
import { PerfilComponent } from './pages/perfil/perfil.component';
import { DevHealthComponent } from './pages/dev-health/dev-health.component';
import { CarritoComponent } from './pages/carrito/carrito.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { emptyCartGuard } from './guards/empty-cart.guard';
import { TicketSummaryComponent } from './pages/ticket-summary/ticket-summary.component';
import { ticketSelectionGuard } from './guards/ticket-selection.guard';

import { PaymentResultComponent } from './pages/payment-result/payment-result.component';

const routes: Routes = [
  { path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '',        component: InicioComponent,  pathMatch: 'full' },
      { path: 'noches',  component: NochesComponent },
      { path: 'noches/:eventId', component: EventDetailComponent },
      { path: 'entradas/resumen', component: TicketSummaryComponent, canActivate: [ticketSelectionGuard] },
      { path: 'tragos',  component: TragosComponent },
      { path: 'wallet',  component: WalletComponent },
      { path: 'perfil',  component: PerfilComponent }
    ]
  },
  {
    path: 'carrito',
    component: CarritoComponent
  },
  {
    path: 'checkout/resultado',
    component: PaymentResultComponent
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [emptyCartGuard]
  },
  {
    path: 'dev/health',
    component: DevHealthComponent
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
