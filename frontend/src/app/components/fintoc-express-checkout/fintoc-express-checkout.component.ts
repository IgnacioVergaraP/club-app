import { AfterViewInit, Component, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Order } from '../../services/orders/orders.service';
import { FintocPaymentsService } from '../../services/payments/fintoc-payments.service';
import { FintocRequest, FintocSdkService, FintocWidget } from '../../services/payments/fintoc-sdk.service';

let nextContainer = 0;

@Component({
  selector: 'app-fintoc-express-checkout',
  templateUrl: './fintoc-express-checkout.component.html',
  styleUrls: ['./fintoc-express-checkout.component.scss'],
  standalone: false
})
export class FintocExpressCheckoutComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() order!: Order;
  @Output() busyChange = new EventEmitter<boolean>();
  @Output() verifiedChange = new EventEmitter<boolean>();
  @Output() attemptChange = new EventEmitter<boolean>();
  readonly containerId = `void-apple-pay-${++nextContainer}`;
  readonly usesHttp = window.location.protocol !== 'https:';
  state = 'loading';
  message = 'Preparando Apple Pay Sandbox…';
  available = false;
  busy = false;
  sdkSucceeded = false;
  verified = false;
  canVerify = false;
  private widget?: FintocWidget;
  private viewReady = false;
  private destroyed = false;
  private generation = 0;
  private requesting = false;
  private awaitingResult = false;
  private readyTimer?: ReturnType<typeof setTimeout>;
  private expiryTimer?: ReturnType<typeof setInterval>;
  private readonly cycle$ = new Subject<void>();

  constructor(private payments: FintocPaymentsService, private sdk: FintocSdkService,
              private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.viewReady = true;
    // El contenedor debe existir antes de Fintoc.create; evitar cambios durante el primer check.
    Promise.resolve().then(() => { if (!this.destroyed) { this.restart(); } });
  }
  ngOnChanges(): void {
    if (this.viewReady) { this.setBusy(false); this.restart(); }
  }

  restart(): void {
    if (this.busy || this.destroyed) { return; }
    this.cleanup();
    this.generation++;
    this.awaitingResult = false;
    this.verified = this.sdkSucceeded = this.canVerify = false;
    this.verifiedChange.emit(false);
    this.available = false;
    this.state = 'loading';
    this.message = 'Preparando Apple Pay Sandbox…';
    if (!this.payable()) { this.expire(); return; }
    this.expiryTimer = setInterval(() => this.zone.run(() => {
      if (!this.busy && !this.verified && !this.payable()) { this.expire(); }
    }), 1000);
    void this.mount(this.generation);
  }

  private payable(): boolean {
    return this.order?.status === 'pending_payment' && this.order.currency === 'CLP' &&
      Number.isSafeInteger(this.order.total_clp) && this.order.total_clp > 0 &&
      Date.parse(this.order.expires_at) > Date.now();
  }

  private current(generation: number): boolean { return !this.destroyed && generation === this.generation; }

  private async mount(generation: number): Promise<void> {
    try {
      const config = await firstValueFrom(this.payments.config().pipe(takeUntil(this.cycle$)));
      if (!this.current(generation)) { return; }
      if (!config.enabled || config.mode !== 'test' || !config.public_key?.startsWith('pk_test_')) {
        this.state = 'disabled';
        this.message = 'Apple Pay Sandbox está pendiente de configurar con claves de prueba.';
        return;
      }
      const sdk = await this.sdk.load();
      if (!this.current(generation) || !this.payable()) { return; }
      this.readyTimer = setTimeout(() => this.zone.run(() => {
        if (this.current(generation) && this.state === 'loading') {
          this.state = 'error'; this.message = 'No se pudo determinar la disponibilidad de Apple Pay. Puedes reintentar.';
          this.available = false;
        }
      }), 12000);
      this.widget = sdk.create({
        product: 'payments', publicKey: config.public_key, country: 'cl',
        expressCheckout: {
          container: this.containerId, amount: this.order.total_clp, currency: 'CLP',
          buttonHeight: 52, buttonBorderRadius: 12, buttonType: { applePay: 'buy' },
          buttonStyle: { applePay: 'white' }, locale: { applePay: 'es-MX' }
        },
        onPaymentRequest: request => this.zone.run(() => this.requestSession(request, generation)),
        onSuccess: () => this.zone.run(() => {
          if (!this.current(generation)) { return; }
          this.sdkSucceeded = true; this.available = false; this.canVerify = true;
          this.message = 'Fintoc informó éxito. Verificando el pago Sandbox con el servidor…';
          void this.verify();
        }),
        onExit: () => this.zone.run(() => {
          if (!this.current(generation) || this.sdkSucceeded) { return; }
          this.awaitingResult = false;
          this.setBusy(false); this.state = 'cancelled';
          this.message = 'La operación se cerró o fue cancelada. No se ha confirmado un pago.';
        }),
        onEvent: (name, metadata) => this.zone.run(() => {
          if (!this.current(generation)) { return; }
          if (name === 'express_checkout_ready') {
            clearTimeout(this.readyTimer);
            this.available = metadata?.wallets?.applePay === true;
            this.state = this.available ? 'ready' : 'unavailable';
            this.message = this.available ? 'Apple Pay disponible para una prueba Sandbox.' :
              'Apple Pay no está disponible en esta sesión. Revisa dispositivo, navegador, HTTPS y habilitación del dominio con Fintoc.';
          } else if (name === 'processing_express_checkout_payment') {
            this.setBusy(true); this.state = 'processing'; this.message = 'Procesando el intento Sandbox…';
          } else if (name === 'payment_error' || name === 'express_checkout_error') {
            this.awaitingResult = false;
            this.setBusy(false); this.state = 'error';
            if (name === 'express_checkout_error') { this.available = false; }
            this.message = 'Fintoc no pudo completar la operación Sandbox. No se ha confirmado el pago. Puedes reintentar.';
          }
        })
      });
    } catch {
      if (!this.current(generation)) { return; }
      this.state = 'error'; this.available = false; this.setBusy(false);
      this.message = 'No se pudo iniciar Fintoc Sandbox. Revisa la conexión y reintenta.';
    }
  }

  private async requestSession(request: FintocRequest, generation: number): Promise<{ sessionToken: string }> {
    if (!this.current(generation) || !this.payable() || this.requesting || this.awaitingResult || this.sdkSucceeded ||
        request.payment_method_type !== 'card' || request.wallet !== 'apple_pay') {
      throw new Error('La solicitud de pago Sandbox no es válida o ya está en curso.');
    }
    this.requesting = true; this.canVerify = true; this.attemptChange.emit(true); this.setBusy(true);
    try {
      const result = await firstValueFrom(this.payments.createSession(this.order.order_id)
        .pipe(takeUntil(this.cycle$)));
      if (!this.current(generation) || !result.session_token) { throw new Error(); }
      this.awaitingResult = true;
      return { sessionToken: result.session_token };
    } catch {
      if (this.current(generation)) {
        this.setBusy(false); this.state = 'error';
        this.message = 'No se pudo obtener la sesión Sandbox. Reintenta o vuelve a preparar el pedido si está por vencer.';
      }
      throw new Error('No se pudo obtener la sesión de pago Sandbox.');
    } finally { this.requesting = false; }
  }

  async verify(): Promise<void> {
    if (this.destroyed || this.state === 'verifying') { return; }
    const generation = this.generation;
    this.setBusy(true); this.state = 'verifying'; this.canVerify = true;
    try {
      const result = await firstValueFrom(this.payments.verify(this.order.order_id)
        .pipe(takeUntil(this.cycle$)));
      if (!this.current(generation)) { return; }
      this.verified = result.verified === true && result.mode === 'test' &&
        result.order_id === this.order.order_id && result.status === 'succeeded';
      this.verifiedChange.emit(this.verified);
      if (!this.verified && ['failed', 'expired', 'rejected', 'not_started'].includes(result.status)) {
        this.attemptChange.emit(false);
      }
      this.state = this.verified ? 'verified' : 'pending';
      this.message = this.verified ? 'Pago Sandbox verificado por el servidor. Esta prueba no representa un cobro real.' :
        'El servidor aún no confirma el pago Sandbox. Puedes volver a verificar su estado.';
    } catch {
      if (this.current(generation)) {
        this.state = 'pending'; this.message = 'No se pudo verificar el pago. Su resultado todavía no está confirmado.';
      }
    } finally { if (this.current(generation)) { this.setBusy(false); } }
  }

  private setBusy(value: boolean): void { this.busy = value; this.busyChange.emit(value); }
  private expire(): void {
    this.cleanup(); this.generation++; this.available = false; this.state = 'expired';
    this.message = 'La cotización venció. Vuelve a preparar el pedido para probar Apple Pay.';
  }
  private cleanup(): void {
    this.cycle$.next(); clearTimeout(this.readyTimer); clearInterval(this.expiryTimer);
    try { this.widget?.destroy(); } catch { /* El SDK ya puede haber eliminado el iframe. */ }
    this.widget = undefined;
  }
  ngOnDestroy(): void {
    this.destroyed = true; this.generation++; this.cleanup();
    this.cycle$.complete();
  }
}
