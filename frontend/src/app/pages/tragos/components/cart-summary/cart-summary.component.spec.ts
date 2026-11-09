import { CommonModule } from '@angular/common';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MOCK_PRODUCTS } from '../../../../data/mock-products';
import { CartSelectionService } from '../../../../services/cart-selection.service';
import { FintocRedirectService } from '../../../../services/payments/fintoc-redirect.service';
import { CartSummaryComponent } from './cart-summary.component';

describe('Pago directo desde Tragos', () => {
  let fixture: ComponentFixture<CartSummaryComponent>;
  let http: HttpTestingController;
  let cart: CartSelectionService;
  let redirect: jasmine.SpyObj<FintocRedirectService>;
  const url = 'https://pay.fintoc.com/checkout/cs_test';
  const product = MOCK_PRODUCTS[0];

  beforeEach(async () => {
    redirect = jasmine.createSpyObj('redirect', ['open']);
    await TestBed.configureTestingModule({
      imports: [CommonModule, HttpClientTestingModule, RouterTestingModule],
      declarations: [CartSummaryComponent],
      providers: [{ provide: FintocRedirectService, useValue: redirect }]
    }).compileComponents();
    cart = TestBed.inject(CartSelectionService);
    cart.increment(product);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CartSummaryComponent);
    fixture.detectChanges();
  });

  afterEach(() => { fixture.destroy(); http.verify(); });

  function pendingOrder() {
    return http.expectOne(request => request.url.endsWith('/orders'));
  }
  function pendingSession() {
    return http.expectOne(request => request.url.endsWith('/hosted-checkout-session'));
  }
  function order(overrides = {}) {
    return { order_id: 'demo-order', status: 'pending_payment', currency: 'CLP',
      total_clp: product.priceClp, expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
      ...overrides };
  }

  it('un clic prepara el pedido y abre Fintoc sin pasar por carrito ni checkout', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Pagar con Fintoc');
    button.click();
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
    fixture.componentInstance.pay();
    const request = pendingOrder();
    expect(request.request.body).toEqual({ items: [{ product_id: product.id, quantity: 1 }] });
    request.flush(order());
    fixture.componentInstance.pay();
    const session = pendingSession();
    expect(session.request.body).toEqual({ order_id: 'demo-order' });
    expect(redirect.open).not.toHaveBeenCalled();
    session.flush({ mode: 'test', redirect_url: url });
    expect(redirect.open).toHaveBeenCalledOnceWith(url);
    expect(fixture.componentInstance.busy).toBeTrue();
    fixture.componentInstance.pay();
    expect(cart.getQuantity(product.id)).toBe(1);
  });

  it('no crea pedidos con selección vacía', () => {
    cart.clear(); fixture.detectChanges(); fixture.componentInstance.pay();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    http.expectNone(request => request.method === 'POST');
  });

  it('conserva la clave y selección al reintentar un fallo del pedido', () => {
    fixture.componentInstance.pay();
    const first = pendingOrder();
    const key = first.request.headers.get('Idempotency-Key');
    first.flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('selección se conserva');
    expect(fixture.componentInstance.busy).toBeFalse();
    fixture.componentInstance.pay();
    const retry = pendingOrder();
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush(order()); pendingSession().flush({ mode: 'test', redirect_url: url });
  });

  it('reintenta la misma orden si falla la sesión Fintoc', () => {
    fixture.componentInstance.pay(); const first = pendingOrder();
    const key = first.request.headers.get('Idempotency-Key');
    first.flush(order());
    pendingSession().flush({}, { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.busy).toBeFalse();
    fixture.componentInstance.pay(); const retry = pendingOrder();
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush(order()); pendingSession().flush({ mode: 'test', redirect_url: url });
    expect(redirect.open).toHaveBeenCalledOnceWith(url);
  });

  it('detiene el pago si el total del servidor difiere del mostrado', () => {
    fixture.componentInstance.pay(); pendingOrder().flush(order({ total_clp: product.priceClp + 500 }));
    http.expectNone(request => request.url.endsWith('/hosted-checkout-session'));
    expect(redirect.open).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('difiere');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/carrito');
  });

  it('renueva la clave en el siguiente intento si la cotización está por vencer', () => {
    fixture.componentInstance.pay(); const first = pendingOrder();
    const key = first.request.headers.get('Idempotency-Key');
    first.flush(order({ expires_at: new Date(Date.now() + 60000).toISOString() }));
    http.expectNone(request => request.url.endsWith('/hosted-checkout-session'));
    fixture.componentInstance.pay(); const retry = pendingOrder();
    expect(retry.request.headers.get('Idempotency-Key')).not.toBe(key);
    retry.flush(order()); pendingSession().flush({ mode: 'test', redirect_url: url });
  });

  it('rechaza pedidos cancelados, importes inválidos y vencimientos inválidos', () => {
    for (const invalid of [{ status: 'cancelled' }, { currency: 'USD' }, { total_clp: 0 },
      { total_clp: 1.5 }, { expires_at: 'invalid' }]) {
      fixture.componentInstance.pay(); pendingOrder().flush(order(invalid));
      expect(fixture.componentInstance.busy).toBeFalse();
    }
    http.expectNone(request => request.url.endsWith('/hosted-checkout-session'));
    expect(redirect.open).not.toHaveBeenCalled();
  });

  it('cancela pedidos o sesiones en curso si cambia la selección', () => {
    fixture.componentInstance.pay(); const first = pendingOrder();
    cart.increment(product);
    expect(first.cancelled).toBeTrue();
    fixture.componentInstance.pay(); pendingOrder().flush(order({ total_clp: 2 * product.priceClp }));
    const session = pendingSession(); cart.decrement(product.id);
    expect(session.cancelled).toBeTrue();
    expect(fixture.componentInstance.busy).toBeFalse();
    expect(redirect.open).not.toHaveBeenCalled();
  });

  it('no redirige a otro modo y maneja destinos rechazados por el servicio', () => {
    fixture.componentInstance.pay(); pendingOrder().flush(order());
    pendingSession().flush({ mode: 'live', redirect_url: url });
    expect(redirect.open).not.toHaveBeenCalled();
    redirect.open.and.throwError('Destino inválido');
    fixture.componentInstance.pay(); pendingOrder().flush(order());
    pendingSession().flush({ mode: 'test', redirect_url: 'https://example.com' });
    expect(fixture.componentInstance.error).toContain('dirección válida');
    expect(fixture.componentInstance.busy).toBeFalse();
  });

  it('libera el botón tras timeout y cancela solicitudes al salir de Tragos', fakeAsync(() => {
    fixture.componentInstance.pay(); const request = pendingOrder(); tick(15001);
    expect(request.cancelled).toBeTrue();
    expect(fixture.componentInstance.busy).toBeFalse();
    fixture.componentInstance.pay(); pendingOrder().flush(order());
    const session = pendingSession(); fixture.destroy();
    expect(session.cancelled).toBeTrue();
    expect(redirect.open).not.toHaveBeenCalled();
  }));
});
