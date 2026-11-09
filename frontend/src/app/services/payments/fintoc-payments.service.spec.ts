import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FintocPaymentsService } from './fintoc-payments.service';

describe('FintocPaymentsService', () => {
  let service: FintocPaymentsService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(FintocPaymentsService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('envía solo order_id y consulta la verificación por pedido', () => {
    service.createSession('unit-id').subscribe();
    const create = http.expectOne(request => request.url.endsWith('/checkout-session'));
    expect(create.request.body).toEqual({ order_id: 'unit-id' });
    expect(create.request.headers.has('Authorization')).toBeFalse();
    create.flush({ session_token: 'unit-token' });
    service.verify('unit-id').subscribe();
    const status = http.expectOne(request => request.url.endsWith('/orders/unit-id/status'));
    expect(status.request.method).toBe('GET'); status.flush({ verified: false });
  });
  it('resuelve errores por timeout antes del límite de 30 segundos del SDK', fakeAsync(() => {
    let failed = false;
    service.createSession('unit-id').subscribe({ error: () => { failed = true; } });
    const request = http.expectOne(value => value.url.endsWith('/checkout-session'));
    tick(15001); expect(failed).toBeTrue(); expect(request.cancelled).toBeTrue();
  }));
  it('crea Checkout alojado con solo el ID, sin secretos y en endpoint separado', () => {
    service.createHostedSession('unit-id').subscribe();
    const create=http.expectOne(request=>request.url.endsWith('/hosted-checkout-session'));
    expect(create.request.body).toEqual({order_id:'unit-id'});
    expect(create.request.headers.has('Authorization')).toBeFalse();
    create.flush({redirect_url:'https://pay.fintoc.com/checkout/cs_test',mode:'test'});
    service.verifyHosted('unit-id').subscribe();
    http.expectOne(request=>request.url.endsWith('/hosted-orders/unit-id/status')).flush({verified:false});
  });

});
