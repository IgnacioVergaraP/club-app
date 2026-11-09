import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { FintocPaymentsService } from '../../services/payments/fintoc-payments.service';
import { FintocRedirectService } from '../../services/payments/fintoc-redirect.service';

@Component({
  selector: 'app-payment-result', standalone: false,
  template: `<section class="result"><h1>Resultado de Fintoc <span>Sandbox</span></h1>
    <p *ngIf="cancelled">Volviste desde la opción de cancelación. Consultaremos el estado real del intento.</p>
    <p>El regreso desde Fintoc no confirma un pago. Esta prueba no mueve dinero real ni emite entradas o consumos.</p>
    <p *ngIf="orderId">Pedido: {{ orderId }}</p>
    <p role="status" [attr.aria-busy]="busy">{{ message }}</p>
    <p *ngIf="status">Estado consultado: {{ status }}</p>
    <div *ngIf="valid"><button type="button" [disabled]="busy" (click)="verify()">Verificar estado</button>
    <button *ngIf="canResume && !verified" type="button" [disabled]="busy" (click)="resume()">Continuar el mismo intento</button></div>
    <p>Los pedidos de esta demostración se guardan temporalmente en el servidor. Al recargar o volver de Fintoc, el carrito en memoria puede estar vacío.</p>
    <a routerLink="/tragos">Volver a Tragos</a></section>`,
  styles: [`.result{max-width:720px;margin:auto;padding:1.25rem;color:var(--void-text);overflow-wrap:anywhere}h1{font-size:1.25rem}h1 span{color:#c69afa}p{font-size:.875rem;line-height:1.6;color:var(--void-text-muted)}button,a{display:inline-flex;align-items:center;min-height:44px;margin:.5rem .5rem .5rem 0;padding:.5rem .75rem;border:1px solid #9862c3;border-radius:.5rem;background:#20112e;color:#e6cffa;text-decoration:none}button:disabled{opacity:.5}button:focus-visible,a:focus-visible{outline:2px solid #c69afa;outline-offset:3px}`]
})
export class PaymentResultComponent implements OnInit, OnDestroy {
  orderId = ''; valid = false; cancelled = false; busy = false; verified = false; canResume = false;
  status = ''; message = '';
  private readonly cycle$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  constructor(private route: ActivatedRoute, private payments: FintocPaymentsService, private redirect: FintocRedirectService) {}
  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.cycle$.next(); this.busy = false;
      this.orderId = params.get('order_id') || '';
      this.valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(this.orderId);
      this.cancelled = params.get('result') === 'cancelled';
      this.verified = false; this.canResume = false; this.status = '';
      if (this.valid) { this.verify(); } else { this.message = 'Falta una referencia de pedido válida. No se ha confirmado ningún pago.'; }
    });
  }
  verify(): void {
    if (!this.valid || this.busy) { return; }
    this.busy = true; this.canResume = false; this.message = 'Consultando Fintoc desde el servidor…';
    this.payments.verifyHosted(this.orderId).pipe(takeUntil(this.destroy$),takeUntil(this.cycle$),finalize(()=>{this.busy=false;})).subscribe({
      next: result => {
        if (result.mode !== 'test' || result.order_id !== this.orderId) { this.message = 'La respuesta no coincide con el pedido Sandbox.'; return; }
        this.status = result.status;
        this.verified = result.verified === true && result.status === 'succeeded';
        this.canResume = !this.verified && ['created','in_progress'].includes(result.status);
        this.message = this.verified ? 'Pago Sandbox verificado por el servidor. Sin emisión de entradas ni consumos.' :
          result.status === 'requires_action' ? 'Pago pendiente de aprobación o acción adicional. Todavía no está confirmado.' :
          result.status === 'expired' ? 'La sesión venció. El pago no está confirmado.' :
          ['failed','rejected'].includes(result.status) ? 'El intento falló. El pago no está confirmado.' :
          'El servidor aún no confirma el pago. Puedes volver a verificar.';
      }, error: () => { this.message = 'No se pudo consultar el pedido. Reintenta; si Flask se reinició, los pedidos temporales ya no estarán disponibles.'; }
    });
  }
  resume(): void {
    if (!this.valid || this.busy || !this.canResume || this.verified) { return; }
    this.busy = true;
    this.payments.createHostedSession(this.orderId).pipe(takeUntil(this.destroy$),takeUntil(this.cycle$),finalize(()=>{this.busy=false;})).subscribe({
      next: result => {
        try { if (result.mode !== 'test') { throw new Error(); } this.redirect.open(result.redirect_url); }
        catch { this.message = 'No se recibió un destino Sandbox válido.'; }
      }, error: () => { this.message = 'No se pudo continuar la sesión. Verifica el estado antes de intentar un pedido nuevo.'; }
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); this.cycle$.complete(); }
}
