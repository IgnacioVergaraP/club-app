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
  function pending() {
    return http.expectOne(request => request.url.endsWith('/orders/hosted-checkout'));
  }
  function success() { return { mode: 'test', redirect_url: url }; }

  it('un clic abre Fintoc mediante una única solicitud con IDs, cantidades y total mostrado', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click(); fixture.detectChanges();
    expect(button.disabled).toBeTrue(); fixture.componentInstance.pay();
    const request = pending();
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ items: [{ product_id: product.id, quantity: 1 }], expected_total_clp: product.priceClp });
    expect(request.request.headers.has('Idempotency-Key')).toBeTrue();
    request.flush(success());
    expect(redirect.open).toHaveBeenCalledOnceWith(url);
    expect(fixture.componentInstance.busy).toBeTrue(); fixture.componentInstance.pay();
    expect(cart.getQuantity(product.id)).toBe(1);
    http.expectNone(request => request.method === 'POST');
  });
  it('no solicita pagos con selección vacía', () => {
    cart.clear(); fixture.detectChanges(); fixture.componentInstance.pay();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    http.expectNone(request => request.method === 'POST');
  });
  it('conserva clave y selección al reintentar un fallo', () => {
    fixture.componentInstance.pay(); const first = pending();
    const key = first.request.headers.get('Idempotency-Key');
    first.flush({}, { status: 503, statusText: 'Unavailable' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('selección se conserva');
    fixture.componentInstance.pay(); const retry = pending();
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush(success());
  });
  it('muestra diferencia de precio sin redirigir y permite revisar carrito', () => {
    fixture.componentInstance.pay(); pending().flush({ error: 'price_changed' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges(); expect(redirect.open).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('difiere');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/carrito');
  });
  it('renueva clave tras cotización vencida o por vencer', () => {
    for (const code of ['quote_expiring', 'order_not_payable']) {
      fixture.componentInstance.pay(); const first = pending();
      const key = first.request.headers.get('Idempotency-Key');
      first.flush({ error: code }, { status: 409, statusText: 'Conflict' });
      fixture.componentInstance.pay(); const retry = pending();
      expect(retry.request.headers.get('Idempotency-Key')).not.toBe(key);
      retry.flush({}, { status: 503, statusText: 'Unavailable' });
    }
  });
  it('cancela la solicitud si cambia la selección', () => {
    fixture.componentInstance.pay(); const first = pending(); cart.increment(product);
    expect(first.cancelled).toBeTrue(); expect(fixture.componentInstance.busy).toBeFalse();
    fixture.componentInstance.pay(); const changed = pending();
    expect(changed.request.body.items[0].quantity).toBe(2);
    changed.flush(success()); expect(redirect.open).toHaveBeenCalledOnceWith(url);
  });
  it('rechaza modo live y maneja destinos rechazados', () => {
    fixture.componentInstance.pay(); pending().flush({ mode: 'live', redirect_url: url });
    expect(redirect.open).not.toHaveBeenCalled();
    redirect.open.and.throwError('invalid'); fixture.componentInstance.pay();
    pending().flush(success()); expect(fixture.componentInstance.error).toContain('dirección válida');
    expect(fixture.componentInstance.busy).toBeFalse();
  });
  it('libera botón tras timeout y cancela al salir', fakeAsync(() => {
    fixture.componentInstance.pay(); const first = pending(); tick(20001);
    expect(first.cancelled).toBeTrue(); expect(fixture.componentInstance.busy).toBeFalse();
    fixture.componentInstance.pay(); const second = pending(); fixture.destroy();
    expect(second.cancelled).toBeTrue(); expect(redirect.open).not.toHaveBeenCalled();
  }));
});
