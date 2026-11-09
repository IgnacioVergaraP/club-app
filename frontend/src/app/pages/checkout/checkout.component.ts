import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, TimeoutError } from 'rxjs';
import { finalize, take, takeUntil } from 'rxjs/operators';
import { CartItem, CartSelectionService } from '../../services/cart-selection.service';
import { Order, OrderRequestItem, OrdersService } from '../../services/orders/orders.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  standalone: false
})
export class CheckoutComponent implements OnInit, OnDestroy {
  items$!: Observable<CartItem[]>;
  totalUnits$!: Observable<number>;
  subtotal$!: Observable<number>;
  readonly serviceFee = 0;
  loading = false;
  errorMessage = '';
  order: Order | null = null;
  priceDifference = 0;
  paymentBusy = false;
  paymentAttempted = false;
  hostedAttempted = false;
  sandboxVerified = false;
  private currentItems: CartItem[] = [];
  private cartFingerprint = '';
  private cartVersion = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private cart: CartSelectionService,
    private router: Router,
    private orders: OrdersService
  ) {}

  ngOnInit(): void {
    this.cart.isEmpty$.pipe(take(1), takeUntil(this.destroy$)).subscribe(empty => {
      if (empty) {
        this.router.navigate(['/carrito']);
      }
    });
    this.items$ = this.cart.items$;
    this.totalUnits$ = this.cart.totalUnits$;
    this.subtotal$ = this.cart.totalPriceClp$;
    // Descartar resultados anteriores cuando cambia el contenido del carrito.
    this.items$.pipe(takeUntil(this.destroy$)).subscribe(items => {
      this.currentItems = items;
      const payload = this.requestItems();
      this.orders.syncCart(payload);
      const fingerprint = JSON.stringify(payload);
      if (fingerprint !== this.cartFingerprint) {
        this.cartFingerprint = fingerprint;
        this.cartVersion++;
        this.order = null;
        this.sandboxVerified = false;
        this.paymentBusy = false;
        this.paymentAttempted = false;
        this.hostedAttempted = false;
        this.priceDifference = 0;
        this.errorMessage = '';
      }
    });
  }

  prepareOrder(): void {
    if (this.loading || this.paymentBusy || this.paymentAttempted || this.hostedAttempted || this.sandboxVerified || this.currentItems.length === 0) {
      return;
    }
    if (this.order && Date.parse(this.order.expires_at) - Date.now() < 10 * 60 * 1000 + 5000) {
      this.orders.renewQuote();
      this.order = null;
    }
    this.loading = true;
    this.errorMessage = '';
    const version = this.cartVersion;
    const estimatedTotal = this.currentItems.reduce((sum, item) => sum + item.subtotalClp, 0)
      + this.serviceFee;
    this.orders.prepareOrder(this.requestItems()).pipe(
      takeUntil(this.destroy$),
      finalize(() => { this.loading = false; })
    ).subscribe({
      next: order => {
        if (version !== this.cartVersion) {
          return;
        }
        this.order = order;
        this.priceDifference = order.total_clp - estimatedTotal;
      },
      error: (error: unknown) => {
        if (version !== this.cartVersion) {
          return;
        }
        if (error instanceof TimeoutError ||
            (error instanceof HttpErrorResponse && error.status === 0)) {
          this.errorMessage = 'No se pudo conectar con el servidor. Reintenta: conservaremos la misma solicitud para evitar duplicados.';
        } else if (error instanceof HttpErrorResponse && error.status < 500) {
          this.errorMessage = error.error?.message || 'No se pudo validar el pedido. Revisa el carrito.';
        } else {
          this.errorMessage = 'El servidor no pudo preparar el pedido. Puedes reintentar.';
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatClp(value: number): string {
    return this.cart.formatClp(value);
  }

  totalWithFee(subtotal: number): number {
    return subtotal + this.serviceFee;
  }

  goBack(): void {
    if (this.paymentBusy) { return; }
    this.router.navigate(['/carrito']);
  }

  trackByProductId(_: number, item: CartItem): string {
    return item.product.id;
  }

  private requestItems(): OrderRequestItem[] {
    return this.currentItems.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity
    })).sort((a, b) => a.product_id.localeCompare(b.product_id));
  }
}
