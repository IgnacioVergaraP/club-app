import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { HeaderComponent } from './layout/header/header.component';
import { BottomNavComponent } from './layout/bottom-nav/bottom-nav.component';
import { InicioComponent } from './pages/inicio/inicio.component';
import { NochesComponent } from './pages/noches/noches.component';
import { EventDetailComponent } from './pages/event-detail/event-detail.component';
import { TicketSummaryComponent } from './pages/ticket-summary/ticket-summary.component';
import { TragosComponent } from './pages/tragos/tragos.component';
import { WalletComponent } from './pages/wallet/wallet.component';
import { PerfilComponent } from './pages/perfil/perfil.component';
import { DevHealthComponent } from './pages/dev-health/dev-health.component';
import { ProductCardComponent } from './pages/tragos/components/product-card/product-card.component';
import { CategoryFilterComponent } from './pages/tragos/components/category-filter/category-filter.component';
import { CartSummaryComponent } from './pages/tragos/components/cart-summary/cart-summary.component';
import { CarritoComponent } from './pages/carrito/carrito.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { FintocExpressCheckoutComponent } from './components/fintoc-express-checkout/fintoc-express-checkout.component';

import { FintocHostedCheckoutComponent } from './components/fintoc-hosted-checkout/fintoc-hosted-checkout.component';
import { PaymentResultComponent } from './pages/payment-result/payment-result.component';

@NgModule({
  declarations: [
    AppComponent,
    MainLayoutComponent,
    HeaderComponent,
    BottomNavComponent,
    InicioComponent,
    NochesComponent,
    EventDetailComponent,
    TicketSummaryComponent,
    TragosComponent,
    WalletComponent,
    PerfilComponent,
    DevHealthComponent,
    ProductCardComponent,
    CategoryFilterComponent,
    CartSummaryComponent,
    CarritoComponent,
    CheckoutComponent,
    FintocExpressCheckoutComponent,
    FintocHostedCheckoutComponent,
    PaymentResultComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
