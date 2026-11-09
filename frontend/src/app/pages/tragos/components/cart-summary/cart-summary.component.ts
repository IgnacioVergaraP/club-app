import { Component, OnDestroy } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { finalize, switchMap, takeUntil } from 'rxjs/operators';
import { CartItem, CartSelectionService } from '../../../../services/cart-selection.service';
import { OrdersService } from '../../../../services/orders/orders.service';
import { FintocPaymentsService } from '../../../../services/payments/fintoc-payments.service';
import { FintocRedirectService } from '../../../../services/payments/fintoc-redirect.service';

@Component({
  selector: 'app-cart-summary',
  templateUrl: './cart-summary.component.html',
  styleUrls: ['./cart-summary.component.scss'],
  standalone: false
})
export class CartSummaryComponent implements OnDestroy {
  readonly totalUnits$: Observable<number>;
  readonly totalPriceClp$: Observable<number>;
  busy = false;
  error = '';
  private items: CartItem[] = [];
  private fingerprint = '';
  private redirecting = false;
  private readonly cancelPayment$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private cart: CartSelectionService,
    private orders: OrdersService,
    private payments: FintocPaymentsService,
    private redirect: FintocRedirectService
  ) {
    this.totalUnits$ = cart.totalUnits$;
    this.totalPriceClp$ = cart.totalPriceClp$;
    cart.items$.pipe(takeUntil(this.destroy$)).subscribe(items => {
      const fingerprint = JSON.stringify(items.map(item => [item.product.id, item.quantity]).sort());
      if (fingerprint !== this.fingerprint) {
        this.cancelPayment$.next();
        this.fingerprint = fingerprint;
        this.redirecting = false;
        this.busy = false;
        this.error = '';
      }
      this.items = items;
    });
  }

  formatPrice(value: number): string {
    return this.cart.formatClp(value);
  }

  pay(): void {
    if (this.busy || this.items.length === 0) { return; }
    const estimatedTotal = this.items.reduce((sum, item) => sum + item.subtotalClp, 0);
    const payload = this.items.map(item => ({ product_id: item.product.id, quantity: item.quantity }))
      .sort((a, b) => a.product_id.localeCompare(b.product_id));
    this.busy = true;
    this.error = '';
    this.orders.prepareOrder(payload).pipe(
      switchMap(order => {
        if (order.status !== 'pending_payment' || order.currency !== 'CLP' ||
            !Number.isSafeInteger(order.total_clp) || order.total_clp <= 0) {
          return throwError(() => new Error('invalid-order'));
        }
        if (!(Date.parse(order.expires_at) - Date.now() >= 10 * 60 * 1000 + 5000)) {
          this.orders.renewQuote();
          return throwError(() => new Error('expired-order'));
        }
        if (order.total_clp !== estimatedTotal) {
          this.error = `El total del servidor es ${this.formatPrice(order.total_clp)} y difiere del mostrado. Revisa el pedido en el carrito antes de pagar.`;
          return throwError(() => new Error('price-changed'));
        }
        return this.payments.createHostedSession(order.order_id);
      }),
      takeUntil(this.cancelPayment$),
      takeUntil(this.destroy$),
      finalize(() => { this.busy = this.redirecting; })
    ).subscribe({
      next: result => {
        try {
          if (result.mode !== 'test') { throw new Error('invalid-mode'); }
          this.redirect.open(result.redirect_url);
          this.redirecting = true;
        } catch {
          this.error = 'No se pudo abrir una dirección válida de Fintoc Sandbox. Puedes reintentar.';
        }
      },
      error: () => {
        if (!this.error) {
          this.error = 'No se pudo iniciar el pago con Fintoc. Tu selección se conserva; vuelve a intentarlo.';
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cancelPayment$.complete();
  }
}
