import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MOCK_PRODUCTS } from '../../data/mock-products';
import { CartSelectionService } from '../../services/cart-selection.service';
import { Order } from '../../services/orders/orders.service';
import { CheckoutComponent } from './checkout.component';

@Component({ selector: 'app-fintoc-express-checkout', template: '', standalone: false })
class FintocStubComponent {
  @Input() order!: Order;
  @Output() busyChange = new EventEmitter<boolean>();
  @Output() verifiedChange = new EventEmitter<boolean>();
  @Output() attemptChange = new EventEmitter<boolean>();
}

@Component({ selector: 'app-fintoc-hosted-checkout', template: '', standalone: false })
class HostedStubComponent extends FintocStubComponent { @Input() disabled = false; }

const ORDER: Order = {
  order_id: '4cc803f9-f77b-4073-a5dd-6df96b92cb36',
  idempotency_key: 'ec56292e-f69c-4186-b8a9-b49e474d6eae',
  status: 'pending_payment',
  items: [{ product_id: 'piscola', name: 'Piscola', quantity: 1,
    unit_price_clp: 6000, subtotal_clp: 6000 }],
  total_units: 1, subtotal_clp: 6000, service_fee_clp: 0, total_clp: 6000,
  currency: 'CLP', created_at: '2026-10-30T18:00:00Z', expires_at: '2026-10-30T18:15:00Z'
};

describe('Checkout con API de pedidos', () => {
  let fixture: ComponentFixture<CheckoutComponent>;
  let http: HttpTestingController;
  let cart: CartSelectionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, HttpClientTestingModule],
      declarations: [CheckoutComponent, FintocStubComponent, HostedStubComponent],
      providers: [{ provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }]
    }).compileComponents();
    cart = TestBed.inject(CartSelectionService);
    cart.increment(MOCK_PRODUCTS[0]);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  function pending() {
    return http.expectOne(request => request.url.endsWith('/orders'));
  }

  it('envía solo IDs y cantidades, bloquea dobles clics y conserva el carrito', () => {
    const button = fixture.nativeElement.querySelector('.prepare-btn') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
    fixture.componentInstance.prepareOrder();
    const request = pending();
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ items: [{ product_id: 'piscola', quantity: 1 }] });
    expect(request.request.headers.get('Idempotency-Key')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    request.flush(ORDER);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Pedido preparado — pago pendiente');
    expect(fixture.nativeElement.textContent).toContain(ORDER.order_id);
    expect(cart.getQuantity('piscola')).toBe(1);
    expect(button.disabled).toBeFalse();
  });

  it('muestra caída del backend y reintenta con la misma clave incluso tras navegar', () => {
    fixture.componentInstance.prepareOrder();
    const first = pending();
    const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudo conectar con el servidor');
    fixture.destroy();
    fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges();
    fixture.componentInstance.prepareOrder();
    const retry = pending();
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush(ORDER);
  });

  it('renueva la clave cuando cambia el carrito fuera del checkout', () => {
    fixture.componentInstance.prepareOrder();
    const first = pending();
    const key = first.request.headers.get('Idempotency-Key');
    first.flush(ORDER);
    fixture.destroy();
    cart.increment(MOCK_PRODUCTS[0]);
    cart.decrement('piscola');
    fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges();
    fixture.componentInstance.prepareOrder();
    const changed = pending();
    expect(changed.request.headers.get('Idempotency-Key')).not.toBe(key);
    changed.flush(ORDER);
  });

  it('muestra el importe del servidor y advierte si difiere del estimado', () => {
    fixture.componentInstance.prepareOrder();
    pending().flush({ ...ORDER, subtotal_clp: 6500, total_clp: 6500,
      items: [{ ...ORDER.items[0], unit_price_clp: 6500, subtotal_clp: 6500 }] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Total del servidor: $6.500 CLP');
    expect(fixture.nativeElement.querySelector('.order-warning').textContent)
      .toContain('no está listo para autorizar un pago');
  });

  it('muestra errores de validación del servidor', () => {
    fixture.componentInstance.prepareOrder();
    pending().flush({ message: 'Producto no disponible.' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Producto no disponible.');
    expect(fixture.componentInstance.loading).toBeFalse();
  });

  it('libera el botón tras un timeout y mantiene la clave', fakeAsync(() => {
    fixture.componentInstance.prepareOrder();
    const first = pending();
    const key = first.request.headers.get('Idempotency-Key');
    tick(15001);
    expect(first.cancelled).toBeTrue();
    expect(fixture.componentInstance.loading).toBeFalse();
    fixture.componentInstance.prepareOrder();
    const retry = pending();
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush(ORDER);
  }));

  it('descarta la respuesta anterior si cambia el carrito durante la solicitud', () => {
    fixture.componentInstance.prepareOrder();
    const request = pending();
    cart.increment(MOCK_PRODUCTS[0]);
    request.flush(ORDER);
    expect(fixture.componentInstance.order).toBeNull();
    expect(fixture.componentInstance.loading).toBeFalse();
  });

  it('bloquea preparar otro pedido durante procesamiento o con un intento sin resolver', () => {
    fixture.componentInstance.prepareOrder(); pending().flush(ORDER); fixture.detectChanges();
    const payment = fixture.debugElement.query(By.directive(FintocStubComponent)).componentInstance as FintocStubComponent;
    payment.busyChange.emit(true); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.prepare-btn').disabled).toBeTrue();
    fixture.componentInstance.prepareOrder();
    payment.busyChange.emit(false); payment.attemptChange.emit(true); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.prepare-btn').disabled).toBeTrue();
    fixture.componentInstance.prepareOrder();
    http.expectNone(request => request.url.endsWith('/orders'));
  });

  it('renueva explícitamente una cotización por vencer con otra clave, antes de intentar pagar', () => {
    fixture.componentInstance.prepareOrder(); const first = pending();
    const key = first.request.headers.get('Idempotency-Key');
    first.flush({ ...ORDER, expires_at: new Date(Date.now() + 8 * 60000).toISOString() });
    fixture.componentInstance.prepareOrder(); const renewal = pending();
    expect(renewal.request.headers.get('Idempotency-Key')).not.toBe(key);
    renewal.flush({ ...ORDER, expires_at: new Date(Date.now() + 15 * 60000).toISOString() });
  });
  it('oculta Apple Pay y bloquea otra preparación tras iniciar Checkout alojado', () => {
    fixture.componentInstance.prepareOrder(); pending().flush(ORDER); fixture.detectChanges();
    const hosted=fixture.debugElement.query(By.directive(HostedStubComponent)).componentInstance as HostedStubComponent;
    hosted.attemptChange.emit(true); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-fintoc-express-checkout')).toBeNull();
    expect(fixture.nativeElement.querySelector('.prepare-btn').disabled).toBeTrue();
    fixture.componentInstance.prepareOrder();http.expectNone(request=>request.url.endsWith('/orders'));
  });

});
