import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Order } from '../../services/orders/orders.service';
import { FintocPaymentsService } from '../../services/payments/fintoc-payments.service';
import { FintocOptions, FintocSdkService } from '../../services/payments/fintoc-sdk.service';
import { FintocExpressCheckoutComponent } from './fintoc-express-checkout.component';

describe('Fintoc Express Checkout (SDK y proveedor simulados)', () => {
  let fixture: ComponentFixture<FintocExpressCheckoutComponent>;
  let payments: jasmine.SpyObj<FintocPaymentsService>;
  let sdk: jasmine.SpyObj<FintocSdkService>;
  let options: FintocOptions;
  let create: jasmine.Spy;
  let destroy: jasmine.Spy;
  let order: Order;

  beforeEach(async () => {
    order = { order_id: '4cc803f9-f77b-4073-a5dd-6df96b92cb36', idempotency_key: 'unit',
      status: 'pending_payment', items: [], total_units: 1, subtotal_clp: 6000,
      service_fee_clp: 0, total_clp: 6000, currency: 'CLP',
      created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 900000).toISOString() };
    payments = jasmine.createSpyObj<FintocPaymentsService>('Payments', ['config', 'createSession', 'verify']);
    payments.config.and.returnValue(of({ enabled: true, mode: 'test', public_key: 'pk_test_unit' }));
    payments.createSession.and.returnValue(of({ session_token: 'unit-sensitive-token' }));
    payments.verify.and.returnValue(of({ order_id: order.order_id, mode: 'test', status: 'succeeded', verified: true }));
    destroy = jasmine.createSpy('destroy');
    create = jasmine.createSpy('create').and.callFake((value: FintocOptions) => {
      expect(document.getElementById(value.expressCheckout.container)).not.toBeNull();
      options = value; return { destroy };
    });
    sdk = jasmine.createSpyObj<FintocSdkService>('SDK', ['load']);
    sdk.load.and.resolveTo({ create });
    await TestBed.configureTestingModule({
      imports: [CommonModule], declarations: [FintocExpressCheckoutComponent],
      providers: [{ provide: FintocPaymentsService, useValue: payments }, { provide: FintocSdkService, useValue: sdk }]
    }).compileComponents();
  });
  function check(body: () => void): () => void {
    return fakeAsync(() => { try { body(); } finally { fixture?.destroy(); flushMicrotasks(); } });
  }
  function render(value = order): FintocExpressCheckoutComponent {
    fixture = TestBed.createComponent(FintocExpressCheckoutComponent);
    fixture.componentRef.setInput('order', value);
    fixture.detectChanges(); flushMicrotasks(); fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('monta una única instancia sobre un contenedor existente y usa el importe Flask', check(() => {
    render(); fixture.detectChanges();
    expect(create).toHaveBeenCalledTimes(1);
    expect(options.product).toBe('payments'); expect(options.country).toBe('cl');
    expect(options.publicKey).toBe('pk_test_unit');
    expect(options.expressCheckout.amount).toBe(6000); expect(options.expressCheckout.currency).toBe('CLP');
    expect(options.expressCheckout.buttonHeight).toBe(52);
    expect(payments.createSession).not.toHaveBeenCalled();
  }));

  it('no carga SDK con configuración pendiente o una clave que no sea publicable de prueba', check(() => {
    payments.config.and.returnValue(of({ enabled: false, public_key: null, mode: 'test' }));
    const component = render();
    expect(component.state).toBe('disabled'); expect(sdk.load).not.toHaveBeenCalled();
  }));

  it('mantiene oculto el contenedor hasta confirmar disponibilidad del SDK', check(() => {
    const component = render(); expect(component.available).toBeFalse();
    options.onEvent('express_checkout_ready', { wallets: {} }); fixture.detectChanges();
    expect(component.state).toBe('unavailable');
    expect(fixture.nativeElement.querySelector('.apple-container').style.visibility).toBe('hidden');
    options.onEvent('express_checkout_ready', { wallets: { applePay: true } }); fixture.detectChanges();
    expect(component.available).toBeTrue();
    expect(fixture.nativeElement.querySelector('.apple-container').style.visibility).toBe('visible');
  }));

  it('onPaymentRequest pide sesión solo para Apple Pay y devuelve sessionToken', check(() => {
    const component = render(); let token = '';
    options.onEvent('processing_express_checkout_payment');
    options.onPaymentRequest({ payment_method_type: 'card', wallet: 'apple_pay' }).then(value => { token = value.sessionToken; });
    flushMicrotasks();
    expect(token).toBe('unit-sensitive-token');
    expect(payments.createSession).toHaveBeenCalledOnceWith(order.order_id);
    expect(component.busy).toBeTrue();
  }));

  it('rechaza callbacks duplicados y métodos fuera del alcance', check(() => {
    render(); const pending = new Subject<{ session_token: string }>();
    payments.createSession.and.returnValue(pending);
    let duplicateRejected = false; let otherRejected = false;
    options.onPaymentRequest({ payment_method_type: 'card', wallet: 'apple_pay' }).catch(() => undefined);
    options.onPaymentRequest({ payment_method_type: 'card', wallet: 'apple_pay' }).catch(() => { duplicateRejected = true; });
    options.onPaymentRequest({ payment_method_type: 'bank_transfer' }).catch(() => { otherRejected = true; });
    flushMicrotasks(); expect(duplicateRejected).toBeTrue(); expect(otherRejected).toBeTrue();
    expect(payments.createSession).toHaveBeenCalledTimes(1);
    pending.next({ session_token: 'safe-retry' }); flushMicrotasks();
  }));

  it('onSuccess no basta: exige verificación del backend antes de informar éxito', check(() => {
    const component = render();
    payments.verify.and.returnValue(of({ verified: false, status: 'in_progress', mode: 'test', order_id: order.order_id }));
    options.onSuccess({ status: 'succeeded', amount: 1, mode: 'live' }); flushMicrotasks();
    expect(component.verified).toBeFalse(); expect(component.state).toBe('pending');
    expect(payments.verify).toHaveBeenCalledWith(order.order_id);
    payments.verify.and.returnValue(of({ verified: true, status: 'succeeded', mode: 'test', order_id: order.order_id }));
    void component.verify(); flushMicrotasks();
    expect(component.verified).toBeTrue(); expect(component.busy).toBeFalse();
    expect(order.status).toBe('pending_payment');
  }));

  it('bloquea otro callback tras entregar token hasta que el SDK resuelva o falle', check(() => {
    render();
    options.onPaymentRequest({ payment_method_type: 'card', wallet: 'apple_pay' }).catch(() => undefined);
    flushMicrotasks();
    let rejected = false;
    options.onPaymentRequest({ payment_method_type: 'card', wallet: 'apple_pay' }).catch(() => { rejected = true; });
    flushMicrotasks(); expect(rejected).toBeTrue(); expect(payments.createSession).toHaveBeenCalledTimes(1);
    options.onEvent('payment_error');
    options.onPaymentRequest({ payment_method_type: 'card', wallet: 'apple_pay' }).catch(() => undefined);
    flushMicrotasks(); expect(payments.createSession).toHaveBeenCalledTimes(2);
  }));

  it('cancelación y error liberan carga sin declarar un pago rechazado o pagado', check(() => {
    const component = render();
    options.onEvent('processing_express_checkout_payment'); expect(component.busy).toBeTrue();
    options.onExit('user_closed'); expect(component.state).toBe('cancelled'); expect(component.busy).toBeFalse();
    options.onEvent('processing_express_checkout_payment'); options.onEvent('payment_error');
    expect(component.state).toBe('error'); expect(component.busy).toBeFalse(); expect(component.verified).toBeFalse();
    options.onEvent('express_checkout_error'); expect(component.available).toBeFalse();
  }));

  it('gestiona caída de Flask y fallo al verificar sin filtrar detalles internos', check(() => {
    const component = render();
    payments.createSession.and.returnValue(throwError(() => new Error('private-error-token')));
    let error = '';
    options.onPaymentRequest({ payment_method_type: 'card', wallet: 'apple_pay' }).catch(reason => { error = reason.message; });
    flushMicrotasks(); expect(component.busy).toBeFalse(); expect(error).not.toContain('private-error-token');
    payments.verify.and.returnValue(throwError(() => new Error('backend-down')));
    options.onSuccess({}); flushMicrotasks();
    expect(component.state).toBe('pending'); expect(component.verified).toBeFalse(); expect(component.busy).toBeFalse();
  }));

  it('destruye el widget y descarta callbacks antiguos al cambiar pedido o salir', check(() => {
    const component = render(); const old = options;
    fixture.componentRef.setInput('order', { ...order, order_id: 'a2b59551-5a47-43f9-987a-9e47cb14c03e' });
    fixture.detectChanges(); flushMicrotasks();
    expect(destroy).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledTimes(2);
    old.onSuccess({}); expect(payments.verify).not.toHaveBeenCalled();
    fixture.destroy(); options.onEvent('processing_express_checkout_payment');
    expect(component.busy).toBeFalse(); expect(destroy).toHaveBeenCalledTimes(2);
  }));

  it('bloquea pedidos vencidos y controla disponibilidad sin respuesta', check(() => {
    const component = render(); tick(12001);
    expect(component.state).toBe('error');
    fixture.componentRef.setInput('order', { ...order, expires_at: '2000-01-01T00:00:00Z' });
    fixture.detectChanges(); flushMicrotasks();
    expect(component.state).toBe('expired'); expect(component.available).toBeFalse();
    expect(create).toHaveBeenCalledTimes(1);
  }));
});
