import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { Order } from '../../services/orders/orders.service';
import { FintocPaymentsService } from '../../services/payments/fintoc-payments.service';
import { FintocRedirectService } from '../../services/payments/fintoc-redirect.service';

@Component({
  selector: 'app-fintoc-hosted-checkout', standalone: false,
  template: `<div class="hosted-checkout"><button type="button" class="hosted-pay-btn" [disabled]="disabled || busy" [attr.aria-busy]="busy" (click)="pay()">{{ busy ? 'Abriendo Fintoc…' : 'Pagar con Fintoc · Sandbox' }}</button>
    <p>Continúa en la página de pago de Fintoc. Prueba sin dinero real; los métodos disponibles se muestran allí.</p>
    <p *ngIf="error" role="alert">{{ error }}</p></div>`,
  styles: [`.hosted-checkout{margin-bottom:1rem}button{width:100%;min-height:48px;background:#7625e6;color:#fff;border:0;border-radius:.5rem;padding:.75rem;font:inherit}button:disabled{opacity:.5}button:focus-visible{outline:2px solid #dfbaff;outline-offset:3px}p{font-size:.75rem;color:#b8afc4;margin:.5rem 0}[role=alert]{color:#ffb4b4}`]
})
export class FintocHostedCheckoutComponent implements OnDestroy {
  @Input() order!: Order;
  @Input() disabled = false;
  @Output() busyChange = new EventEmitter<boolean>();
  @Output() attemptChange = new EventEmitter<boolean>();
  busy = false;
  error = '';
  private readonly destroy$ = new Subject<void>();
  constructor(private payments: FintocPaymentsService, private redirect: FintocRedirectService) {}
  pay(): void {
    if (this.busy || this.disabled) { return; }
    if (!this.order || this.order.status !== 'pending_payment' || this.order.currency !== 'CLP' ||
        !Number.isSafeInteger(this.order.total_clp) || this.order.total_clp <= 0 ||
        !(Date.parse(this.order.expires_at) > Date.now())) {
      this.error = 'El pedido no admite un pago. Vuelve a preparar el pedido.'; return;
    }
    this.busy = true; this.error = ''; this.busyChange.emit(true); this.attemptChange.emit(true);
    this.payments.createHostedSession(this.order.order_id).pipe(takeUntil(this.destroy$),
      finalize(() => { this.busy = false; this.busyChange.emit(false); })).subscribe({
      next: result => {
        try { if (result.mode !== 'test') { throw new Error(); } this.redirect.open(result.redirect_url); }
        catch { this.error = 'Fintoc no devolvió una dirección Sandbox válida. No se ha confirmado un pago.'; }
      },
      error: () => { this.error = 'No se pudo abrir Fintoc Sandbox. Puedes reintentar la misma solicitud. Si la cotización está por vencer, vuelve al carrito para preparar un pedido nuevo.'; }
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
